/*
 * Copyright (c) 2017 Chase Patterson
 */

if (!chapatt) {
    var chapatt = {};
}

chapatt.Signal = {
    initSignal: function(name) {
        this.callbacks = [];

        this.name = name;
    },

    connect: function(callback, userData) {
        this.callbacks.push({"callback": callback, "userData": userData});
    },

    emit: function(targetWidget, signalData) {
        var self = this;

        this.callbacks.forEach(function(item) {
            item.callback(targetWidget, self.name, signalData, item.userData);
        });
    },

    new: function(name) {
        var signal = Object.create(this);
        signal.initSignal(name);

        return signal;
    }
}

chapatt.Emitter = {
    initEmitter: function() {
        this.signals = [];
    },

    addSignal: function(name) {
        // if signal exists, throw error
        var signal = chapatt.Signal.new(name);
        this.signals.push(signal);
    },

    signalConnect: function(name, callback, userData) {
        // if signal doesn't exist, throw error
        this.signals.find(function(item) {
            return item.name === name;
        }).connect(callback, userData);
    },

    signalEmit: function(name, signalData) {
        var self = this;

        // if signal doesn't exist, throw error
        this.signals.find(function(item) {
            return item.name === name;
        }).emit(self, signalData);
    }
}

chapatt.Unit = {
    initUnit: function(initialName, initialSymbol, initialConvFrom, initialConvTo) {
        if (initialName) {
            this.name = initialName;
            if (initialSymbol) {
                this.symbol = initialSymbol;
                if (initialConvFrom) {
                    this.convFrom = initialConvFrom;
                    if (initialConvTo) {
                        this.convTo = initialConvTo;
                    }
                }
            }
        }
    },

    new: function(initialName, initialSymbol, initialConvFrom, initialConvTo) {
        var unit = Object.create(this);
        unit.initUnit.apply(unit, function() {
            var args = [];

            if (initialName) {
                args.push(initialName);
                if (initialSymbol) {
                    args.push(initialSymbol);
                    if (initialConvFrom) {
                        args.push(initialConvFrom);
                        if (initialConvTo) {
                            args.push(initialConvTo);
                        }
                    }
                }
            }

            return args;
        }());
        return unit;
    }
}

chapatt.UnitModel = {
    initUnitModel: function(initialUnits) {
        this.units = [];

        if (initialUnits) {
            this.addUnits(initialUnits);
        }
    },

    addUnits: function(units) {
        units.forEach(function(item) {
            this.units.push(item);
        }.bind(this));
    },

    valueFromToUnit: function(value, fromUnitIndex, toUnitIndex) {
    },

    new: function() {
        var unitModel = Object.create(this);
        unitModel.initUnitModel();
        return unitModel;
    }
}

chapatt.ValueModel = {};
Object.assign(chapatt.ValueModel, chapatt.Emitter);
Object.assign(chapatt.ValueModel,
{
    initValueModel: function() {
        this.initEmitter();
        this.addSignal('valueChanged');

        this.unitModel = chapatt.UnitModel.new();
        this.unitIndex = 0;
    },

    getUnitModel: function() {
        return this.unitModel;
    },

    setUnitModel: function(unitModel) {
        this.unitModel = unitModel;
    },

    getUnit: function() {
        return this.unitIndex;
    },

    setUnit: function(unitIndex) {
        this.unitIndex = unitIndex;
    },

    /* If no unitIndex given, get value in current unit */
    getValue: function(unitIndex) {
        if (!unitIndex) {
            return this.value;
        } else {
            return this.unitModel.valueFromToUnit(this.value, this.unitIndex, unitIndex);
        }
    },

    setValue: function(value) {
        this.signalEmit('valueChanged', value);
        this.value = value;
    },

    new: function() {
        var valueModel = Object.create(this);
        valueModel.initValueModel();
        return valueModel;
    }
});

chapatt.Valuable = {
    initValuable: function() {
        this.valueModel = chapatt.ValueModel.new();
    },

    getValueModel: function() {
        return this.valueModel;
    },

    setValueModel: function(valueModel) {
        this.valueModel = valueModel;
    }
}

chapatt.Widget = {
    widgets: [],

    initWidget: function(element) {
        this.element = element;

        this.widgets.push(this);
    },

    getByElement: function(element) {
        return this.instances.find(function(item) {
            return (item.element === element);
        });
    }
}

chapatt.TextBox = Object.create(chapatt.Widget);
Object.assign(chapatt.TextBox, chapatt.Valuable);
Object.assign(chapatt.TextBox,
{
    textBoxes: [],

    initTextBox: function(element) {
        this.initWidget(element);
        this.initValuable();

        this.textBoxes.push(this);

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));

        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        field.addEventListener('keydown', this.fieldHandleKeydown.bind(this));
        field.addEventListener('focusout', this.fieldHandleFocusout.bind(this));

        this.mutatedSinceSaved = false;
        var fieldObserver = new MutationObserver(this.fieldHandleMutation.bind(this));
        fieldObserver.observe(field, {characterData: true, subtree: true});
    },

    handleValueChanged: function(targetWidget, signalName, signalData)  {
        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        field.textContent = signalData;
    },

    fieldHandleKeydown: function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();

            // FIXME! if set to change on enter
            this.saveFieldText();
        }
    },

    fieldHandleFocusout: function(event) {
        // FIXME! if set to change on mouseout
            // only save if text has mutated (to prevent rounding of actual value to display value)
            if (this.mutatedSinceSaved)
                this.saveFieldText();
    },

    fieldHandleMutation: function(mutations) {
        this.mutatedSinceSaved = true;

        // FIXME! if set to change on mutation
        //this.saveFieldText();
    },

    saveFieldText: function() {
        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        this.valueModel.setValue(field.textContent);

        this.mutatedSinceSaved = false;
    },

    new: function(element) {
        var textBox = Object.create(this);
        textBox.initTextBox(element);
        return textBox;
    }
});

chapatt.Button = Object.create(chapatt.Widget);
Object.assign(chapatt.Button, chapatt.Emitter);
Object.assign(chapatt.Button,
{
    buttons: [],

    initButton: function(element) {
        this.initWidget(element);
        this.initEmitter();

        this.buttons.push(this);

        this.addSignal('clicked');
        this.element.addEventListener('click', this.handleClick.bind(this, event));

        this.element.addEventListener('mousedown', function(event)
        {
            event.preventDefault();
        });
    },

    handleClick: function(event) {
            this.signalEmit('clicked');
    },

    new: function(element) {
        var button = Object.create(this);
        button.initButton(element);
        return button;
    }
});

chapatt.ToggleButton = Object.create(chapatt.Button);
Object.assign(chapatt.ToggleButton, chapatt.Valuable);
Object.assign(chapatt.ToggleButton,
{
    toggleButtons: [],

    initToggleButton: function(element) {
        this.initButton(element);
        this.initValuable();

        this.toggleButtons.push(this);

        this.signalConnect('clicked', this.toggle.bind(this));

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));

        if (this.element.classList.contains('selected'))
            this.valueModel.setValue('selected');
        else
            this.valueModel.setValue('unselected');
    },

    toggle: function() {
        if (this.valueModel.getValue() == 'selected') {
            this.valueModel.setValue('unselected');
        } else {
            this.valueModel.setValue('selected');
        }
    },

    handleValueChanged: function(targetWidget, signalName, signalData) {
        classList = this.element.classList;
        if (signalData == 'selected') {
            if (!classList.contains('selected'))
                classList.add('selected');
        } else {
            if (classList.contains('selected'))
                this.element.classList.remove('selected');
        }
    },

    new: function(element) {
        var toggleButton = Object.create(this);
        toggleButton.initToggleButton(element);
        return toggleButton;
    }
});

chapatt.SpinBox = Object.create(chapatt.Widget);
Object.assign(chapatt.SpinBox, chapatt.Valuable);
Object.assign(chapatt.SpinBox,
{
    initSpinBox: function(element) {
        this.initWidget(element);
        this.initValuable();

        /* FIXME! initialize value properly */
        this.valueModel.setValue(0);

        this.field = chapatt.TextBox.new(this.element);
        this.field.getValueModel().signalConnect('valueChanged',
            this.handleFieldValueChanged.bind(this));

        this.increaseButton = chapatt.Button.new(this.element.getElementsByClassName('increase')[0]);
        this.decreaseButton = chapatt.Button.new(this.element.getElementsByClassName('decrease')[0]);

        this.increaseButton.element.addEventListener('click', this.increase.bind(this));
        this.decreaseButton.element.addEventListener('click', this.decrease.bind(this));

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));
    },

    handleFieldValueChanged: function(targetWidget, signalName, signalData) {
        if (isNaN(Number(signalData))) {
            // Not a number; attempt to parse as number with suffix
            this.valueModel.unitModel.units.forEach(function(unit) {
                if (signalData.endsWith(unit.symbol)) {
                    // FIXME! optionally switch to this unit by default
                    this.valueModel.setValue(unit.convFrom(Number(signalData.slice(0, -unit.symbol.length))));
                }
            }.bind(this));
        } else {
            this.valueModel.setValue(Number(signalData));
        }
    },

    increase: function() {
        this.valueModel.setValue(this.valueModel.getValue() + 1);
    },

    decrease: function() {
        this.valueModel.setValue(this.valueModel.getValue() - 1);
    },

    handleValueChanged: function(targetWidget, signalName, signalData) {
        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        // FIXME! round before displaying
        field.textContent = signalData;
    },

    new: function(element) {
        var spinBox = Object.create(this);
        spinBox.initSpinBox(element);
        return spinBox;
    }
});
