/*
 * Person is a class representing any AbstractPerson that has sufficient information to be
 * displayed on the final pedigree graph (printed or exported). Person objects
 * contain information about disorders, age and other relevant properties, as well
 * as graphical data to visualize this information.
 *
 * @param x the x coordinate on the Raphael canvas at which the node drawing will be centered
 * @param the y coordinate on the Raphael canvas at which the node drawing will be centered
 * @param gender either 'M', 'F' or 'U' depending on the gender
 * @param id a unique ID number
 * @param isProband set to true if this person is the proband
 */

var Person = Class.create(AbstractPerson, {

    initialize: function($super, x, y, gender, id) {
        this._firstName = "";
        this._lastName = "";
        this._birthDate = "";
        this._deathDate = "";
        this._conceptionDate = "";
        this._isAdopted = false;
        this._lifeStatus = 'alive';
        this._isProband = (id == 1);
        this._childlessStatus = null;
        this._childlessReason = "";
        this._disorders = [];
        this._evaluations = [];
        this._type = "Person";
        $super(x, y, gender, id);
    },

    /*
     * Initializes the object responsible for creating graphics for this Person
     *
     * @param x the x coordinate on the canvas at which the node is centered
     * @param y the y coordinate on the canvas at which the node is centered
     */
    generateGraphics: function(x, y) {
        return new PersonVisuals(this, x, y);
    },

    /*
     * Returns true if this node is the proband (i.e. the main patient)
     */
    isProband: function() {
        return this._isProband;
    },

    addPartner: function($super, partner, noChild) {
        var partnership = $super(partner, noChild);
        if(partnership) {
            var status = partner.getType() == "Person" && partner.getChildlessStatus();
            !status && (status = this.getChildlessStatus());
            partnership.setChildlessStatus(status);
        }
        return partnership;
    },

    createNodeAction: function(type, gender) {
        var child = this.createChild(type, gender);
        var childless = this.getChildlessStatus();

        if(child && child.getParentPregnancy()) {
            var childInfo = child.getInfo(),
                nodeID = this.getID(),
                preg = child.getParentPregnancy(),
                pregInfo = preg ? preg.getInfo() : null,
                part = preg.getPartnership(),
                partInfo = part.getInfo(),
                partnerInfo = part.getPartnerOf(this).getInfo();

            var undoFunct = function() {
                var pregnancy = editor.getGraph().getNodeMap()[pregInfo.id];
                pregnancy && pregnancy.remove(false);
                var partnership = editor.getGraph().getNodeMap()[partInfo.id];
                partnership && partnership.remove(false);
                var partner = editor.getGraph().getNodeMap()[partnerInfo.id];
                partner && partner.remove(false);
                var target = editor.getGraph().getNodeMap()[childInfo.id];
                target && target.remove(false);
            };

            var redoFunct = function() {
                var existingChild = editor.getGraph().getNodeMap()[childInfo.id],
                    existingPreg = editor.getGraph().getNodeMap()[pregInfo.id],
                    existingPart = editor.getGraph().getNodeMap()[partInfo.id],
                    existingPartner = editor.getGraph().getNodeMap()[partnerInfo.id],
                    me = editor.getGraph().getNodeMap()[nodeID];
                if(me && !(existingChild || existingPreg || existingPart || existingPartner )) {
                    var target = editor.getGraph()["add" + type](childInfo.x, childInfo.y, gender, childInfo.id);
                    var partner = editor.getGraph().addPlaceHolder(partnerInfo.x, partnerInfo.y, gender, partnerInfo.id);
                    var partnership = editor.getGraph().addPartnership(partInfo.x, partInfo.y, me, partner, partInfo.id);
                    var pregnancy = editor.getGraph().addPregnancy(pregInfo.x, pregInfo.y, partnership, pregInfo.id);
                    pregnancy.addChild(target);
                    childless && partnership.setChildlessStatus(childless);
                }
            };
            editor.getActionStack().push({undo: undoFunct, redo: redoFunct})
        }
    },

    createPartnerAction: function() {
        var partnership = this.createPartner(false);
        if(partnership){
            var nodeID = this.getID(),
                part = partnership.getInfo(),
                partner = partnership.getPartnerOf(this).getInfo(),
                preg = (partnership.getPregnancies()[0]) ? partnership.getPregnancies()[0].getInfo() : null,
                ph = preg ? partnership.getPregnancies()[0].getChildren()[0].getInfo() : null;

            var redoFunct = function() {
                var source = editor.getGraph().getNodeMap()[nodeID];
                if(source) {
                    var person = editor.getGraph().addPerson(partner.x, partner.y, partner.gender, partner.id);
                    var newPartnership = editor.getGraph().addPartnership(part.x, part.y, source, person, part.id);
                    if(preg) {
                        var pr = editor.getGraph().addPregnancy(preg.x, preg.y, newPartnership, preg.id);
                        var child = editor.getGraph().addPlaceHolder(ph.x, ph.y, ph.gender, ph.id);
                        pr.addChild(child);
                    }
                    newPartnership.setChildlessStatus(part.childlessStatus);
                }
            };

            var undoFunct = function() {
                if(preg) {
                    var placeholder = editor.getGraph().getNodeMap()[ph.id];
                    placeholder && placeholder.remove(false);
                }
                var thePartner = editor.getGraph().getNodeMap()[partner.id];
                thePartner && thePartner.remove(false);
            };
            editor.getActionStack().push({undo: undoFunct, redo: redoFunct})
        }
    },

    addPartnerAction: function(partner) {
        var partnership = this.addPartner(partner);
        if(partnership) {
            var part = partnership.getInfo(),
                preg = (partnership.getPregnancies()[0]) ? partnership.getPregnancies()[0].getInfo() : null,
                ph = preg ? partnership.getPregnancies()[0].getChildren()[0].getInfo() : null,
                nodeID = this.getID(),
                partnerID = partner.getID();

            var redoFunct = function() {
                var source = editor.getGraph().getNodeMap()[nodeID];
                var person = editor.getGraph().getNodeMap()[partnerID];
                if(source && person) {
                    var p = editor.getGraph().addPartnership(part.x, part.y, source, person, part.id);
                    if(preg) {
                        var pr = editor.getGraph().addPregnancy(preg.x, preg.y, p, preg.id);
                        var child = editor.getGraph().addPlaceHolder(ph.x, ph.y, ph.gender, ph.id);
                        pr.addChild(child);
                    }
                    p.setChildlessStatus(part.childlessStatus)
                }
            };

            var undoFunct = function() {
                if(preg) {
                    var placeHolder = editor.getGraph().getNodeMap()[ph.id];
                    placeHolder && placeHolder.remove(false);
                }
                var partner = editor.getGraph().getNodeMap()[part.id];
                partner && partner.remove(false);
            };
            editor.getActionStack().push({undo: undoFunct, redo: redoFunct})
        }
    },

    addChildAction: function(child) {
        if(this.addChild(child)) {
            var childID = child.getID(),
                nodeID = this.getID(),
                p = child.getParentPregnancy(),
                pa = p.getPartnership(),
                preg = p.getInfo(),
                part = pa.getInfo(),
                parent = pa.getPartnerOf(this).getInfo();

            var redoFunct = function() {
                var source = editor.getGraph().getNodeMap()[nodeID];
                var theChild = editor.getGraph().getNodeMap()[childID];
                if(source && theChild) {
                    var ph = editor.getGraph().addPlaceHolder(parent.x, parent.y, parent.gender, parent.id);
                    var partnership = editor.getGraph().addPartnership(part.x, part.y, source, ph, part.id);
                    var pregnancy = editor.getGraph().addPregnancy(preg.x, preg.y, partnership, preg.id);
                    pregnancy.addChild(theChild);
                }
            };
            var undoFunct = function() {
                var partnership = editor.getGraph().getNodeMap()[part.id];
                partnership && partnership.remove(false);
                var par = editor.getGraph().getNodeMap()[parent.id];
                par && par.remove(false);
            };
            editor.getActionStack().push({undo: undoFunct, redo: redoFunct});
        }
    },

    createParentsAction: function() {
        var partnership = this.createParents();
        if(partnership) {
            var nodeID = this.getID(),
                part = partnership.getInfo(),
                preg = partnership.getPregnancies()[0].getInfo(),
                parent1 = partnership.getPartners()[0].getInfo(),
                parent2 = partnership.getPartners()[1].getInfo();

            var redoFunct = function() {
                var child = editor.getGraph().getNodeMap()[nodeID];
                if(child) {
                    var par1 = editor.getGraph().addPerson(parent1.x, parent1.y, parent1.gender, parent1.id);
                    var par2 = editor.getGraph().addPerson(parent2.x, parent2.y, parent2.gender, parent2.id);
                    var partn = editor.getGraph().addPartnership(part.x, part.y, par1, par2, part.id);
                    var pregnancy = editor.getGraph().addPregnancy(preg.x, preg.y, partn, preg.id);
                    pregnancy.addChild(child);
                }
            };
            var undoFunct = function() {
                var par1 = editor.getGraph().getNodeMap()[parent1.id];
                var par2 = editor.getGraph().getNodeMap()[parent2.id];
                var partn = editor.getGraph().getNodeMap()[part.id];
                partn && partn.remove(false);
                par1 && par1.remove(false);
                par2 && par2.remove(false);
            };
            editor.getActionStack().push({undo: undoFunct, redo: redoFunct})
        }
    },

    addParents: function($super, partnership) {
        var returnValue = $super(partnership);
        partnership.getChildlessStatus() && this.setAdopted(true);
        return returnValue;
    },

    addParentsAction: function(partnership) {
        if(this.addParents(partnership)) {
            var nodeID = this.getID(),
                partID = partnership.getID(),
                preg = this.getParentPregnancy().getInfo();

            var redoFunct = function() {
                var child = editor.getGraph().getNodeMap()[nodeID];
                var partn  = editor.getGraph().getNodeMap()[partID];
                if(child && partn) {
                    var pregnancy = editor.getGraph().addPregnancy(preg.x, preg.y, partn, preg.id);
                    pregnancy.addChild(child);
                }
            };
            var undoFunct = function() {
                var pregnancy = editor.getGraph().getNodeMap()[preg.id];
                pregnancy && pregnancy.remove();
            };
            editor.getActionStack().push({undo: undoFunct, redo: redoFunct})
        }
    },

    addParentAction: function(parent) {
        var partnership = this.addParent(parent);
        if(partnership && parent) {
            var parentID = parent.getID(),
                nodeID = this.getID(),
                part = partnership.getInfo(),
                partner = partnership.getPartnerOf(parent).getInfo(),
                preg = partnership.getPregnancies()[0].getInfo();
        }

        var redoFunct = function() {
            var child = editor.getGraph().getNodeMap()[nodeID];
            var par = editor.getGraph().getNodeMap()[parentID];
            if(child && par) {
                var ph =  editor.getGraph().addPlaceHolder(partner.x, partner.y, partner.gender, partner.id);
                var partnership = editor.getGraph().addPartnership(part.x, part.y, par, ph, part.id);
                var pregnancy = editor.getGraph().addPregnancy(preg.x, preg.y, partnership, preg.id);
                pregnancy.addChild(child);
            }
        };
        var undoFunct = function() {
            var partnership = editor.getGraph().getNodeMap()[part.id];
            partnership && partnership.remove();
            var ph = editor.getGraph().getNodeMap()[partner.id];
            ph && ph.remove(false);

        };
        editor.getActionStack().push({undo: undoFunct, redo: redoFunct})
    },

    /*
     * Adds a new partnership to the list of partnerships of this node
     *
     * @param partnership is a Partnership object with this node as one of the partners
     */
    addPartnership: function($super, partnership) {
        this.getGraphics().getHoverBox().hideChildHandle();
        $super(partnership);
    },

    /*
     * Removes a partnership from the list of partnerships
     *
     * @param partnership is a Partnership object with this node as one of the partners
     */
    removePartnership: function($super, partnership) {
        this.getGraphics().getHoverBox().unhideChildHandle();
        $super(partnership);
    },

    /*
     * Replaces the parent Pregnancy
     *
     * @param pregnancy is a Pregnancy object
     */
    setParentPregnancy: function($super, pregnancy) {
        $super(pregnancy);
        if(pregnancy) {
            this.getGraphics().getHoverBox().hideParentHandle();
        }
        else {
            this.getGraphics().getHoverBox().unHideParentHandle();
        }
    },

    /*
     * Returns the first name of this Person
     */
    getFirstName: function() {
        return this._firstName;
    },

    /*
     * Replaces the first name of this Person with firstName, and displays the label
     *
     * @param firstName any string that represents the first name of this Person
     */
    setFirstName: function(firstName) {
        firstName && (firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1));
        this._firstName = firstName;
        this.getGraphics().updateNameLabel();
    },

    setFirstNameAction: function(firstName) {
        var oldName = this.getFirstName();
        var nodeID = this.getID();
        this.setFirstName(firstName);
        var actionElement = editor.getActionStack().peek();
        if (actionElement.nodeID == nodeID && actionElement.property == 'FirstName') {
            actionElement.newValue = firstName;
        } else {
            editor.getActionStack().push({
                undo: AbstractNode.setPropertyActionUndo,
                redo: AbstractNode.setPropertyActionRedo,
                nodeID: nodeID,
                property: 'FirstName',
                oldValue: oldName,
                newValue: firstName
            });
        }
    },

    /*
     * Returns the last name of this Person
     */
    getLastName: function() {
        return this._lastName;
    },

    setLastNameAction: function(lastName) {
        var oldName = this.getLastName();
        var nodeID = this.getID();
        this.setLastName(lastName);
        var actionElement = editor.getActionStack().peek();
        if (actionElement.nodeID == nodeID && actionElement.property == 'LastName') {
            actionElement.newValue = lastName;
        } else {
            editor.getActionStack().push({
                undo: AbstractNode.setPropertyActionUndo,
                redo: AbstractNode.setPropertyActionRedo,
                nodeID: nodeID,
                property: 'LastName',
                oldValue: oldName,
                newValue: lastName
            });
        }
    },

    /*
     * Replaces the last name of this Person with lastName, and displays the label
     *
     * @param lastName any string that represents the last name of this Person
     */
    setLastName: function(lastName) {
        lastName && (lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1));
        this._lastName = lastName;
        this.getGraphics().updateNameLabel();
    },
    /*
     * Returns the status of this Person, which can be "alive", "deceased", "stillborn", "unborn" or "aborted"
     */
    getLifeStatus: function() {
        return this._lifeStatus;
    },

    /*
     * Returns true if this node's status is not 'alive' or 'deceased'.
     */
    isFetus: function() {
        return (this.getLifeStatus() != 'alive' && this.getLifeStatus() != 'deceased');
    },

    isValidLifeStatus: function(status) {
        return (status == 'unborn' || status == 'stillborn'
            || status == 'aborted'
            || status == 'alive' || status == 'deceased')
    },

    /*
     * Changes the life status of this Person to newStatus
     *
     * @param newStatus can be "alive", "deceased", "stillborn", "unborn" or "aborted"
     */
    setLifeStatus: function(newStatus) {
        if(this.isValidLifeStatus(newStatus)) {
            this._lifeStatus = newStatus;

            (newStatus != 'deceased') && this.setDeathDate("");
            this.getGraphics().updateSBLabel();

            if(this.isFetus()) {
                this.setBirthDate("");
                this.setAdopted(false);
                this.setChildlessStatus(null);
            }
            this.getGraphics().updateLifeStatusShapes();
            editor.getNodeMenu().update(this,
                {
                    'gestation_age': {value : this.getGestationAge(), inactive : !this.isFetus()},
                    'date_of_birth': {value : this.getBirthDate(), inactive : this.isFetus()},
                    'adopted':       {value : this.isAdopted(), inactive: this.isFetus()},
                    'date_of_death': {value : this.getDeathDate(), inactive: newStatus != 'deceased'},
                    childlessSelect : {value : this.getChildlessStatus() ? this.getChildlessStatus() : 'none', inactive : this.isFetus()},
                    childlessText : {value : this.getChildlessReason() ? this.getChildlessReason() : 'none', inactive : this.isFetus()}
                });
        }
    },

    setLifeStatusAction: function(newStatus) {
        var prevStatus = this.getLifeStatus();
        var nodeID = this.getID();
        if(prevStatus != newStatus && this.isValidLifeStatus(newStatus)) {
            this.setLifeStatus(newStatus);
            editor.getActionStack().push({
                undo: AbstractNode.setPropertyActionUndo,
                redo: AbstractNode.setPropertyActionRedo,
                nodeID: nodeID,
                property: 'LifeStatus',
                oldValue: prevStatus,
                newValue: newStatus
            });
        }
    },

    /*
     * Returns the date object for the conception date of this Person
     */
    getConceptionDate: function() {
        return this._conceptionDate;
    },

    /*
     * Replaces the conception date with newDate
     *
     * @param newDate a javascript Date object
     */
    setConceptionDate: function(newDate) {
        this._conceptionDate = newDate ? (new Date(newDate)) : '';
        this.getGraphics().updateAgeLabel();
    },

    /*
     * Returns the number of weeks since conception
     */
    getGestationAge: function() {
        if(this.getLifeStatus() == 'unborn' && this.getConceptionDate()) {
            var oneWeek = 1000 * 60 * 60 * 24 * 7,
                lastDay = new Date();
            return Math.round((lastDay.getTime() - this.getConceptionDate().getTime()) / oneWeek)
        }
        else if(this.isFetus()){
            return this._gestationAge;
        }
        else {
            return null;
        }
    },

    /*
     * Updates the conception age of the Person given the number of weeks passed since conception,
     *
     * @param numWeeks a number greater than or equal to 0
     */
    setGestationAge: function(numWeeks) {
        if(numWeeks){
            this._gestationAge = numWeeks;
            var daysAgo = numWeeks * 7,
                d = new Date();
            d.setDate(d.getDate() - daysAgo);
            this.setConceptionDate(d);
        }
        else {
            this.setConceptionDate(null);
        }
    },

    setGestationAgeAction: function(newDate) {
        var oldDate = this.getGestationAge();
        var nodeID = this.getID();
        if(oldDate != newDate) {
            this.setGestationAge(newDate);
            editor.getActionStack().push({
                undo: AbstractNode.setPropertyActionUndo,
                redo: AbstractNode.setPropertyActionRedo,
                nodeID: nodeID,
                property: 'GestationAge',
                oldValue: oldDate,
                newValue: newDate
            });
        }
    },

    /*
     * Returns the date object for the birth date of this Person
     */
    getBirthDate: function() {
        return this._birthDate;
    },

    /*
     * Replaces the birth date with newDate
     *
     * @param newDate a javascript Date object, that must be an earlier date than deathDate and
     * a later date than conception date
     */
    setBirthDate: function(newDate) {
        newDate = newDate ? (new Date(newDate)) : '';
        if (!newDate || newDate && !this.getDeathDate() || newDate.getDate() < this.getDeathDate()) {
            this._birthDate = newDate;
            this.getGraphics().updateAgeLabel();
        }
    },

    setBirthDateAction: function(newDate) {
        var oldDate = this.getBirthDate();
        var nodeID = this.getID();
        if(oldDate != newDate) {
            this.setBirthDate(newDate);
            editor.getActionStack().push({
                undo: AbstractNode.setPropertyActionUndo,
                redo: AbstractNode.setPropertyActionRedo,
                nodeID: nodeID,
                property: 'BirthDate',
                oldValue: oldDate,
                newValue: newDate
            });
        }
    },

    /*
     * Returns the date object for the death date of this Person
     */
    getDeathDate: function() {
        return this._deathDate;
    },

    /*
     * Replaces the death date with newDate
     *
     * @param newDate a javascript Date object, that must be a later date than deathDate and
     * a later date than conception date
     */
    setDeathDate: function(deathDate) {
        deathDate = deathDate ? (new Date(deathDate)) : '';
        if(!deathDate || deathDate && !this.getBirthDate() || deathDate.getDate()>this.getBirthDate().getDate()) {
            this._deathDate =  deathDate;
            this._deathDate && (this.getLifeStatus() == 'alive') && this.setLifeStatus('deceased');
        }
        this.getGraphics().updateAgeLabel();
    },

    setDeathDateAction: function(newDate) {
        var oldDate = this.getDeathDate();
        var nodeID = this.getID();
        if(oldDate != newDate) {
            this.setDeathDate(newDate);
            editor.getActionStack().push({
                undo: AbstractNode.setPropertyActionUndo,
                redo: AbstractNode.setPropertyActionRedo,
                nodeID: nodeID,
                property: 'DeathDate',
                oldValue: oldDate,
                newValue: newDate
            });
        }
    },

    /*
     * Returns an array of objects with fields 'id' and 'value', where id is the id number
     * for the disorder, taken from the OMIM database, and 'value' is the name of the disorder.
     * eg. [{id: 33244, value: 'Down Syndrome'}, {id: 13241, value: 'Huntington's Disease'}, ...]
     */
    getDisorders: function() {
        return this._disorders;
    },

    /*
     * Adds disorder to the list of this node's disorders and updates the Legend.
     *
     * @param disorder an object with fields 'id' and 'value', where id is the id number
     * for the disorder, taken from the OMIM database, and 'value' is the name of the disorder.
     * eg. {id: 33244, value: 'Down Syndrome'}
     * @param forceDisplay set to true if you want to display the change on the canvas
     */
    addDisorder: function(disorder, forceDisplay) {
        if(!this.hasDisorder(disorder['id'])) {
            editor.getLegend().addCase(disorder, this);
            this.getDisorders().push(disorder);
        }
        forceDisplay && this.getGraphics().updateDisorderShapes();
    },

    addDisorderAction: function(disorder) {
        if(!this.hasDisorder(disorder['id'])) {
            var nodeID = this.getID();
            this.addDisorder(disorder, true);
            editor.getActionStack().push({
                undo: function() {
                    var node = editor.getGraph().getNodeMap()[nodeID];
                    node && node.removeDisorder(disorder, true);
                },
                redo: function() {
                    var node = editor.getGraph().getNodeMap()[nodeID];
                    node && node.addDisorder(disorder, true);
                }
            })
        }
    },

    /*
     * Removes disorder to the list of this node's disorders and updates the Legend.
     *
     * @param disorder an object with fields 'id' and 'value', where id is the id number
     * for the disorder, taken from the OMIM database, and 'value' is the name of the disorder.
     * eg. {id: 33244, value: 'Down Syndrome'}
     * @param forceDisplay set to true if you want to display the change on the canvas
     */
    removeDisorder: function(disorder, forceDisplay) {
        if(this.getDisorders().indexOf(disorder) >= 0) {
            editor.getLegend().removeCase(disorder, this);
            this._disorders = this.getDisorders().without(disorder);
        }
        else {
            alert("This person doesn't have the specified disorder");
        }
        forceDisplay && this.getGraphics().updateDisorderShapes();
    },

    /*
     * Given a list of disorders, adds and removes the disorders of this node to match
     * the new list
     *
     * @param disorderArray should be an array of objects with fields 'id' and 'value', where id is the id number
     * for the disorder, taken from the OMIM database, and 'value' is the name of the disorder.
     * eg. [{id: 33244, value: 'Down Syndrome'}, {id: 13241, value: 'Huntington's Disease'}, ...]
     */
    setDisorders: function(disorders) {
        var me = this;
        this.getDisorders().each(function(disorder) {
            var found = false;
            disorders.each(function(newDisorder) {
                disorder['id'] == newDisorder['id'] && (found = true);
            });
            !found && me.removeDisorder(disorder);
        });
        disorders.each(function(newDisorder) {
            if (!me.hasDisorder(newDisorder.id)) {
                me.addDisorder(newDisorder);
            }
        });
        this.getGraphics().updateDisorderShapes();
    },

    setDisordersAction: function(disorders) {
        var prevDisorders = this.getDisorders().clone();
        var nodeID = this.getID();
        this.setDisorders(disorders);
        editor.getActionStack().push({
            undo: AbstractNode.setPropertyActionUndo,
            redo: AbstractNode.setPropertyActionRedo,
            nodeID: nodeID,
            property: 'Disorders',
            oldValue: prevDisorders,
            newValue: disorders
        });
    },

    /*
     * Returns true if this person has the disorder with id
     *
     * @param id a string id for the disorder, taken from the OMIM database
     */
    hasDisorder: function(id) {
        for(var i = 0; i < this.getDisorders().length; i++) {
            if(this.getDisorders()[i].id == id) {
                return true;
            }
        }
        return false;
    },

    /*
     * Returns true if this node can be a parent of otherNode
     *
     * @param otherNode is a Person
     */
    canBeParentOf: function($super, otherNode) {
        var preliminary = $super(otherNode);
        if(otherNode.getBirthDate) {
            var incompatibleBirthDate = this.getBirthDate() && otherNode.getBirthDate() && this.getBirthDate() < otherNode.getBirthDate();
            var incompatibleDeathDate = this.getDeathDate() && otherNode.getBirthDate() && this.getDeathDate() < otherNode.getBirthDate().clone().setDate(otherNode.getBirthDate().getDate()-700);
        }
        return preliminary && !incompatibleBirthDate && !incompatibleDeathDate && !this.isFetus();
    },

    /*
     * Replaces this Person with a placeholder without breaking all the connections.
     *
     * @param otherNode is a Person
     */
    convertToPlaceholder: function() {
        var me = this;
        var gender = (this.getPartnerships().length == 0) ? "U" : this.getGender();
        var placeholder = editor.getGraph().addPlaceHolder(this.getX(), this.getY(), this.getGender());
        var parents = this.getUpperNeighbors()[0];
        if(parents) {
            parents.addChild(placeholder);
            parents.removeChild(me);
            placeholder.setGender(gender);
        }
        this.getPartnerships().each(function(partnership) {
            var newPartnership = editor.getGraph().addPartnership(partnership.getX(), partnership.getY(), partnership.getPartnerOf(me), placeholder);
            partnership.getChildren().each(function(child) {
                partnership.removeChild(child);
                newPartnership.addChild(child);
            });
        });
        me.remove(false);
        return placeholder;
    },

    setChildlessStatus: function(status, ignoreOthers) {
        if(!this.isValidChildlessStatus(status))
            status = null;
        if(status != this.getChildlessStatus()) {
            this._childlessStatus = status;
            this.setChildlessReason(null);
            this.getGraphics().updateChildlessShapes();
            if(!ignoreOthers) {
                this.getPartnerships().each(function(partnership) {
                    if(!partnership.getChildlessReason())
                        partnership.setChildlessStatus(status);
                });
            }
        }
    },

    setChildlessStatusAction: function(status) {
        if(status != this.getChildlessStatus()) {
            var me = this;
            var prevStatus = this.getChildlessStatus();
            var nodeID = this.getID();
            var markerID = editor.getActionStack().pushStartMarker();

            this.getPartnerships().each(function(partnership) {
                partnership.setChildlessStatusAction(status);
            });

            this.setChildlessStatus(status, true);
            var undo = function() {
                var node = editor.getGraph().getNodeMap()[nodeID];
                    node && node.setChildlessStatus(prevStatus, true);
            };

            var redo = function() {
                var node = editor.getGraph().getNodeMap()[nodeID];
                node && node.setChildlessStatus(status, true);
            };
            editor.getActionStack().push({undo: undo, redo: redo});
            editor.getActionStack().pushEndMarker(markerID);
        }
    },

    /*
     * Deletes this node, it's placeholder partners and children and optionally
     * removes all the other nodes that are unrelated to the proband node.
     *
     * @param isRecursive set to true if you want to remove related nodes that are
     * not connected to the proband
     */
    remove: function($super, isRecursive, skipConfirmation) {
        var me = this;
        if(!isRecursive) {
            this.getPartners().each(function(partner) {
                if(partner.getType() == 'PlaceHolder') {
                    partner.remove(false);
                }
            });
            var parents = this.getParentPartnership();
            var singleChild = parents && parents.getChildren().length == 1;
            var hasChildren = this.getChildren("Person").concat(this.getChildren("PersonGroup")).length != 0;
            var hasTwoKnownParents = parents && parents.getPartners()[0].getType() == "Person" && parents.getPartners()[1].getType() == "Person";
            var childlessParents = parents && parents.getChildlessStatus();
            if(hasTwoKnownParents && singleChild && !childlessParents || hasChildren) {
                var phInfo = this.convertToPlaceholder().getInfo()
                var returnValue = $super(isRecursive, skipConfirmation);
                returnValue.created && returnValue.created.push(phInfo)
                return returnValue;
            }
            else {
                this.getDisorders().each(function(disorder) {
                    editor.getLegend().removeCase(disorder, me);
                });
                this.getGraphics().getHoverBox().remove();
                return $super(isRecursive, skipConfirmation);
            }
        }
        else {
            return $super(isRecursive, skipConfirmation);
        }
    },

    /*
     * Adds a placeholder child to all partnerships that are missing it.
     */
    restorePlaceholders: function() {
        var me = this;
        this.getPartnerships().each(function(partnership) {
            if(!me.getChildlessStatus() && !partnership.getChildlessStatus() &&
                !partnership.getPartnerOf(me).getChildlessStatus() &&
                partnership.getChildren().length == 0) {
                partnership.createChild('PlaceHolder', 'U')
            }
        });
    },

    /*
     * Returns an object (to be accepted by the menu) with information about this Person
     */
    getSummary: function() {
        var childlessInactive = this.isFetus() || this.hasNonAdoptedChildren();
        return {
            identifier:    {value : this.getID()},
            first_name:    {value : this.getFirstName()},
            last_name:     {value : this.getLastName()},
            gender:        {value : this.getGender(), inactive: (this.getGender() != 'U' && this.getPartners().length > 0)},
            date_of_birth: {value : this.getBirthDate(), inactive: this.isFetus()},
            disorders:     {value : this.getDisorders()},
            adopted:       {value : this.isAdopted(), inactive: (this.isFetus() || (this.getParentPartnership() && this.getParentPartnership().getChildren("Person").length > 1))},
            state:         {value : this.getLifeStatus(), inactive: [(this.getPartnerships().length > 0) ? ['unborn','aborted','stillborn'] : ''].flatten()},
            date_of_death: {value : this.getDeathDate(), inactive: this.getLifeStatus() != 'deceased'},
            gestation_age: {value : this.getGestationAge(), inactive : !this.isFetus()},
            childlessSelect : {value : this.getChildlessStatus() ? this.getChildlessStatus() : 'none', inactive : childlessInactive},
            childlessText : {value : this.getChildlessReason() ? this.getChildlessReason() : undefined, inactive : childlessInactive, disabled : !this.getChildlessStatus()}
        };
    },

    getInfo: function($super) {
        var info = $super();
        info['fName'] = this.getFirstName();
        info['lName'] = this.getLastName();
        info['dob'] = this.getBirthDate();
        info['disorders'] = this.getDisorders().clone();
        info['isAdopted'] = this.isAdopted();
        info['lifeStatus'] = this.getLifeStatus();
        info['dod'] = this.getDeathDate();
        info['gestationAge'] = this.getGestationAge();
        info['childlessStatus'] = this.getChildlessStatus();
        info['childlessReason'] = this.getChildlessReason();
        return info;
     },

    loadInfo: function($super, info) {
        if($super(info)) {
            if(info.fName && this.getFirstName() != info.fName) {
                this.setFirstName(info.fName);
            }
            if(info.lName && this.getLastName() != info.lName) {
                this.setLastName(info.lName);
            }
            if(info.dob && this.getBirthDate() != info.dob) {
                this.setBirthDate(info.dob);
            }
            if(info.disorders) {
                this.setDisorders(info.disorders);
            }
            if(info.isAdopted && this.isAdopted() != info.isAdopted) {
                this.setAdopted(info.isAdopted);
            }
            if(info.lifeStatus && this.getLifeStatus() != info.lifeStatus) {
                this.setLifeStatus(info.lifeStatus);
            }
            if(info.dod && this.getDeathDate() != info.dod) {
                this.setDeathDate(info.dod);
            }
            if(info.gestationAge && this.getGestationAge() != info.gestationAge) {
                this.setGestationAge(info.gestationAge);
            }
            if(info.childlessStatus && this.getChildlessStatus() != info.childlessStatus) {
                this.setChildlessStatus(info.childlessStatus);
            }
            if(info.childlessReason && this.getChildlessReason() != info.childlessReason) {
                this.setChildlessReason(info.childlessReason);
            }
        }
    }
});

Person.addMethods(ChildlessBehavior);