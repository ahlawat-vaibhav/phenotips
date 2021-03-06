var Graph = Class.create({

    initialize: function() {
        this.hoverModeZones = editor.getPaper().set();
        this._placeHolderNodes = [];
        this._partnershipNodes = [];
        this._pregnancyNodes = [];
        this._personGroupNodes = [];
        this._personNodes = [];
        this._idCount = 1;
        this._nodeMap = {};
        this._currentHoveredNode = null;
        this._currentDraggable = null;
    },

    getNodeMap: function() {
        return this._nodeMap;
    },

    getCurrentHoveredNode: function() {
        return this._currentHoveredNode;
    },

    setCurrentHoveredNode: function(node) {
        this._currentHoveredNode = node;
    },

    getCurrentDraggable: function() {
        return this._currentDraggable;
    },

    setCurrentDraggable: function(draggable) {
        this._currentDraggable = draggable;
    },

    generateID: function() {
        return this._idCount++;
    },

    getIdCount: function() {
        return this._idCount
    },

    setIdCount: function(maxID) {
        this._idCount = maxID;
    },

    getProband: function() {
        return this.getNodeMap()[1];
    },

    getAllNodes: function() {
        var pregs = this.getPregnancyNodes(),
            partnerships = this.getPartnershipNodes(),
            placeHolders = this.getPlaceHolderNodes(),
            persons = this.getPersonNodes(),
            personGroups = this.getPersonGroupNodes();

        return pregs.concat(partnerships, placeHolders, personGroups, persons.reverse());
    },

    clearGraph: function(removeProband) {
        var nodes = this.getAllNodes();
        var length = removeProband ? nodes.length : nodes.length - 1;
        for(var i = 0 ; i< length ; i++) {
            nodes[i] && nodes[i].remove(false);
        }
    },

    clearGraphAction: function() {
        var lastAction = editor.getActionStack().peek()
        if(!lastAction || lastAction.property != "clearGraph") {
            var saveData = editor.getSaveLoadEngine().serialize();
            this.clearGraph(false);
            var undo = function() {
                editor.getSaveLoadEngine().load(saveData);
            };
            var redo = function() {
                editor.getGraph().clearGraph(false);
            };
            editor.getActionStack().push({undo: undo, redo:redo, property: "clearGraph"});
        }
    },

    addPartnership : function(x, y, node1, node2, id) {
        var partnership = new Partnership(x, y, node1, node2, id);
        this.getNodeMap()[partnership.getID()] = partnership;
        editor.getNodeIndex()._addNode(partnership, true);
        this._partnershipNodes.push(partnership);
        return partnership;
    },

    removePartnership: function(partnership) {
        delete this.getNodeMap()[partnership.getID()];
        this._partnershipNodes = this._partnershipNodes.without(partnership);
    },

    getPregnancyNodes: function() {
        return this._pregnancyNodes;
    },

    getPersonNodes: function() {
        return this._personNodes;
    },

    getPlaceHolderNodes: function() {
        return this._placeHolderNodes;
    },

    getPartnershipNodes: function() {
        return this._partnershipNodes;
    },

    getPersonGroupNodes: function() {
        return this._personGroupNodes;
    },

    addPerson: function(x, y, gender, id) {
        var isProband = this.getPersonNodes().length == 0;
        if(!isProband) {
        }
        var node = new Person(x, y, gender, id, isProband);
        this.getPersonNodes().push(node);
        this.getNodeMap()[node.getID()] = node;
        editor.getNodeIndex()._addNode(node, true);
        return node;
    },

    removePerson: function(person) {
        delete this.getNodeMap()[person.getID()];
        this._personNodes = this._personNodes.without(person);
    },

    addPlaceHolder: function(x, y, gender, id) {
        var node = new PlaceHolder(x, y, gender, id);
        this.getPlaceHolderNodes().push(node);
        this.getNodeMap()[node.getID()] = node;
        editor.getNodeIndex()._addNode(node, true);
        return node;
    },

    removePlaceHolder: function(placeholder) {
        delete this.getNodeMap()[placeholder.getID()];
        this._placeHolderNodes = this._placeHolderNodes.without(placeholder);
    },

    addPersonGroup: function(x, y, gender, id) {
        var node = new PersonGroup(x, y, gender, id);
        this.getPersonGroupNodes().push(node);
        this.getNodeMap()[node.getID()] = node;
        editor.getNodeIndex()._addNode(node, true);
        return node;
    },

    removePersonGroup: function(groupNode) {
        delete this.getNodeMap()[groupNode.getID()];
        this._personGroupNodes = this._personGroupNodes.without(groupNode);
    },

    addPregnancy: function(x, y, partnership, id) {
        var node = new Pregnancy(x, y, partnership, id);
        this.getPregnancyNodes().push(node);
        this.getNodeMap()[node.getID()] = node;
        editor.getNodeIndex()._addNode(node, true);
        return node;
    },

    removePregnancy: function(pregnancy) {
        delete this.getNodeMap()[pregnancy.getID()];
        this._pregnancyNodes = this._pregnancyNodes.without(pregnancy);
    },

    // HOVER MODE
    enterHoverMode: function(sourceNode, hoverTypes) {
        if(this.getCurrentDraggable().getType() == "parent") {
            this.getPartnershipNodes().each(function(partnershipBubble) {
                partnershipBubble.getGraphics().grow();
            })
        }
        var me = this,
            color,
            hoverNodes = [];
        hoverTypes.each(function(type) {
            hoverNodes = hoverNodes.concat(me["get" + type + "Nodes"]())
        });
        hoverNodes.without(sourceNode).each(function(node) {
            var hoverModeZone = node.getGraphics().getHoverBox().getHoverZoneMask().clone().toFront();
            hoverModeZone.attr("cursor", "pointer");
            hoverModeZone.hover(
                function() {
                    me._currentHoveredNode = node;
                    node.getGraphics().getHoverBox().setHovered(true);
                    node.getGraphics().getHoverBox().getBoxOnHover().attr(editor.attributes.boxOnHover);

                    if(me.getCurrentDraggable().getType() == 'PlaceHolder' && me.getCurrentDraggable().canMergeWith(node)) {
                        me.getCurrentDraggable().validHoveredNode = node;
                        color = "green";
                    }
                    else if(me.getCurrentDraggable().getType() == "partner" && sourceNode.canPartnerWith(node)) {
                        node.validPartnerSelected = true;
                        color = "green";
                    }
                    else if(me.getCurrentDraggable().getType() == "child" && sourceNode.canBeParentOf(node)) {
                        node.validChildSelected = true;
                        color = "green";
                    }
                    else if(me.getCurrentDraggable().getType() == "parent" && node.canBeParentOf(sourceNode)) {
                        if(node.getType() == 'Person') {
                            node.validParentSelected = true;
                        }
                        else {
                            node.validParentsSelected = true;
                        }
                        color = "green";
                    }
                    else {
                        color = "red";
                    }
                    node.getGraphics().getHoverBox().getBoxOnHover().attr("fill", color);
                },
                function() {
                    me.getCurrentDraggable() && (me.getCurrentDraggable().validHoveredNode = null);
                    node.getGraphics().getHoverBox().setHovered(false);
                    node.getGraphics().getHoverBox().getBoxOnHover().attr(editor.attributes.boxOnHover).attr('opacity', 0);
                    me._currentHoveredNode = null;
                    node.validPartnerSelected = node.validChildSelected =  node.validParentSelected = node.validParentsSelected = false;
                });
            me.hoverModeZones.push(hoverModeZone);
        });
    },

    exitHoverMode: function() {
        this.hoverModeZones.remove();
        this.getPartnershipNodes().each(function(partnership) {
            partnership.getGraphics().area && partnership.getGraphics().area.remove();
        });
    }
});