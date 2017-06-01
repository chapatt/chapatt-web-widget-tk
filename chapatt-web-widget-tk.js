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
        if (arguments.length >= 1)
            this.name = initialName;
        if (arguments.length >= 2)
            this.symbol = initialSymbol;
        if (arguments.length >= 3)
            this.convFrom = initialConvFrom;
        if (arguments.length >= 4)
            this.convTo = initialConvTo;
    },

    new: function(initialName, initialSymbol, initialConvFrom, initialConvTo) {
        var argc = arguments.length;
        var unit = Object.create(this);
        unit.initUnit.apply(unit, function() {
            var args = [];

            if (argc >= 1)
                args.push(initialName);
            if (argc >= 2)
                args.push(initialSymbol);
            if (argc >= 3)
                args.push(initialConvFrom);
            if (argc >= 4)
                args.push(initialConvTo);

            return args;
        }());
        return unit;
    }
}

chapatt.UnitTable = {
    initUnitTable: function(initialUnits) {
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
        var unitTable = Object.create(this);
        unitTable.initUnitTable();
        return unitTable;
    }
}

chapatt.ValueModel = {};
Object.assign(chapatt.ValueModel, chapatt.Emitter);
Object.assign(chapatt.ValueModel,
{
    initValueModel: function() {
        this.initEmitter();
        this.addSignal('valueChanged');

        this.unitTable = chapatt.UnitTable.new();
        this.unitIndex = 1;
    },

    getUnitTable: function() {
        return this.unitTable;
    },

    setUnitTable: function(unitTable) {
        this.unitTable = unitTable;
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
            return this.unitTable.valueFromToUnit(this.value, this.unitIndex, unitIndex);
        }
    },

    setValue: function(value) {
        if (this.value == value)
            return;

        this.signalEmit('valueChanged', value);
        this.value = value;
    },

    new: function() {
        var valueModel = Object.create(this);
        valueModel.initValueModel();
        return valueModel;
    }
});

chapatt.Bounded = {
    setValue: function(value) {
        if (this.value == value) {
            return;
        }

        if (value < this.minimum) {
            if (this.value == this.minimum)
                return;

            this.signalEmit('valueChanged', this.minimum);
            this.value = this.minimum;
        } else if (value > this.maximum) {
            if (this.value == this.maximum)
                return;

            this.signalEmit('valueChanged', this.maximum);
            this.value = this.maximum;
        } else {
            this.signalEmit('valueChanged', value);
            this.value = value;
        }
    },

    getMinimum: function() {
        return this.minimum;
    },

    setMinimum: function(minimum) {
        this.minimum = minimum;
    },

    getMaximum: function() {
        return this.maximum;
    },

    setMaximum: function(maximum) {
        this.maximum = maximum;
    }
};

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
        this.element.addEventListener('click', this.handleClick.bind(this));

        this.element.addEventListener('mousedown', function(event)
        {
            event.preventDefault();
        });
    },

    handleClick: function() {
            this.signalEmit('clicked');
    },

    new: function(element) {
        var button = Object.create(this);
        button.initButton(element);
        return button;
    }
});

chapatt.ValueTable = {
    initValueTable: function(initialValues) {
        this.values = [];

        initialValues.forEach(function(item) {
            this.values.push(item);
        }.bind(this));
    },

    addValue: function(value) {
        this.values.push(value);
    },

    new: function(initialValues) {
        var valueTable = Object.create(this);
        valueTable.initValueTable(initialValues);
        return valueTable;
    }
};

chapatt.CycleButton = Object.create(chapatt.Button);
Object.assign(chapatt.CycleButton, chapatt.Valuable);
Object.assign(chapatt.CycleButton,
{
    cycleButtons: [],

    initCycleButton: function(element, initialValues) {
        this.initButton(element);
        this.initValuable();

        this.cycleButtons.push(this);

        this.signalConnect('clicked', this.cycle.bind(this));

        this.valueTable = chapatt.ValueTable.new(initialValues);

        if (this.element.classList.contains('selected'))
            this.valueModel.setValue(1);
        else
            this.valueModel.setValue(0);
    },

    cycle: function() {
        if ((value = this.valueModel.getValue()) < this.valueTable.values.length - 1) {
            this.valueModel.setValue(value + 1);
        } else {
            this.valueModel.setValue(0);
        }
    },

    new: function(element, initialValues) {
        var cycleButton = Object.create(this);
        cycleButton.initCycleButton(element, initialValues);
        return cycleButton;
    }
});

chapatt.ToggleButton = Object.create(chapatt.CycleButton);
Object.assign(chapatt.ToggleButton,
{
    initToggleButton: function(element) {
        this.initCycleButton(element, [0, 1]);

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));
    },

    handleValueChanged: function(targetWidget, signalName, signalData) {
        classList = this.element.classList;
        if (signalData == 1) {
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
    initSpinBox: function(element, initialUnits) {
        this.initWidget(element);
        this.initValuable();
        this.valueModel.getUnitTable().addUnits(initialUnits);

        // the magnitude of the wheel delta which results in 1 unit change.
        // Larger values result in finer adjustment
        this.scrollPixelsPerUnit = 10;
        // the magnitude of the mousemove delta which results in 1 unit change.
        // Larger values result in finer adjustment
        this.mousemovePixelsPerUnit = 75;

        // if a mousedown was received in the SpinBox and the corresponding mouseup
        // hasn't yet been received
        this.mouseIsDown = false;

        // minimum mousemove before it affects the value
        this.dragMinimumMovement = 10;
        this.dragMinimumMovementExceeded = false;

        this.cursorYOnMousedown = null;
        this.valueOnMousedown = null;

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));

        this.field = chapatt.TextBox.new(this.element);
        this.field.valueModel.signalConnect('valueChanged',
            this.handleFieldValueChanged.bind(this));

        this.increaseButton = chapatt.Button.new(this.element.getElementsByClassName('increase')[0]);
        this.decreaseButton = chapatt.Button.new(this.element.getElementsByClassName('decrease')[0]);

        this.increaseButton.element.addEventListener('click', this.increase.bind(this));
        this.decreaseButton.element.addEventListener('click', this.decrease.bind(this));
        this.element.addEventListener('wheel', this.handleWheel.bind(this));
        this.element.addEventListener('mousedown', this.handleMousedown.bind(this));
        document.documentElement.addEventListener('mousemove', this.handleMousemove.bind(this));
        document.documentElement.addEventListener('mouseup', this.handleMouseup.bind(this));

        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        this.setValueParsingString(field.textContent);
    },

    handleMousedown: function(event) {
        this.cursorYOnMousedown = event.clientY;
        this.valueOnMousedown = this.valueModel.getValue();
        this.mouseIsDown = true;
    },

    handleMousemove: function(event) {
        if (this.mouseIsDown) {
            var deltaY = this.cursorYOnMousedown - event.clientY;

            if (Math.abs(deltaY) >= this.dragMinimumMovement) {
                this.dragMinimumMovementExceeded = true;
            }

            if (this.dragMinimumMovementExceeded) {
                this.valueModel.setValue(this.valueOnMousedown + (deltaY / this.mousemovePixelsPerUnit));
            }

            event.preventDefault();
        }
    },

    handleMouseup: function(event) {
        if (this.mouseIsDown) {
            this.mouseIsDown = false;
            this.dragMinimumMovementExceeded = false;
        }
    },

    handleFieldValueChanged: function(targetWidget, signalName, signalData) {
        this.setValueParsingString(signalData);
    },

    setValueParsingString: function(string) {
        var units = this.valueModel.getUnitTable().units;
        if (isNaN(Number(string))) {
            // Not a number; attempt to parse as number with suffix
            units.forEach(function(unit, index) {
                if (string.endsWith(unit.symbol)) {
                    // if set to switch to this unit by default
                    this.valueModel.setUnit(index);

                    var newValue = unit.convFrom(Number(string.slice(0, -unit.symbol.length)));
                    this.valueModel.setValue(newValue);
                }
            }.bind(this));
        } else {
            var newValue = units[this.valueModel.unitIndex].convFrom(Number(string));
            this.valueModel.setValue(newValue);
        }
    },

    increase: function() {
        var units = this.valueModel.getUnitTable().units;
        var newValue = this.valueModel.getValue() + units[this.valueModel.getUnit()].convFrom(1);
        this.valueModel.setValue(newValue);
    },

    decrease: function() {
        var units = this.valueModel.getUnitTable().units;
        var newValue = this.valueModel.getValue() - units[this.valueModel.getUnit()].convFrom(1);
        this.valueModel.setValue(newValue);
    },

    handleValueChanged: function(targetWidget, signalName, signalData) {
        var field = this.element.getElementsByClassName('field')[0].firstElementChild;
        // FIXME! round before displaying
        var units = this.valueModel.getUnitTable().units;
        field.textContent = units[this.valueModel.unitIndex].convTo(signalData);

        // FIXME! if set to show unit suffix
        field.textContent = field.textContent + ' ' + units[this.valueModel.unitIndex].symbol;
    },

    handleWheel: function(event) {
        // FIXME! add x and y scrolling
        var units = this.valueModel.getUnitTable().units;
        var newValue = this.valueModel.getValue() + units[this.valueModel.getUnit()].convFrom(-event.deltaY / this.scrollPixelsPerUnit);
        this.valueModel.setValue(newValue);

        event.preventDefault();
    },

    new: function(element, initialUnits) {
        var spinBox = Object.create(this);
        spinBox.initSpinBox(element, initialUnits);
        return spinBox;
    }
});

chapatt.Bar = Object.create(chapatt.Widget);
Object.assign(chapatt.Bar, chapatt.Valuable);
Object.assign(chapatt.Bar,
{
    initBar: function(element) {
        this.initWidget(element);
        this.initValuable();

        Object.assign(this.valueModel, chapatt.Bounded);
        this.valueModel.setMinimum(0);
        this.valueModel.setMaximum(1);

        this.valueModel.signalConnect('valueChanged', this.handleValueChanged.bind(this));
    },

    handleValueChanged: function(targetWidget, signalName, signalData) {
        var bar = this.element.getElementsByClassName('bar')[0];
        bar.style.width = signalData * 100 + '%';
    },

    new: function(element) {
        var bar = Object.create(this);
        bar.initBar(element);
        return bar;
    }
});

chapatt.Slider = Object.create(chapatt.SpinBox);
Object.assign(chapatt.Slider,
{
    initSlider: function(element, initialUnits, minimum, maximum) {
        this.initSpinBox(element, initialUnits);

        Object.assign(this.valueModel, chapatt.Bounded);
        this.valueModel.setMinimum(minimum);
        this.valueModel.setMaximum(maximum);

        this.bar = chapatt.Bar.new(this.element);

        this.valueModel.signalConnect('valueChanged', this.setBar.bind(this));
    },

    setBar: function(targetWidget, signalName, signalData) {
        var fraction = signalData / (this.valueModel.getMaximum() - this.valueModel.getMinimum());
        this.bar.getValueModel().setValue(fraction);
    },

    new: function(element, initialUnits, minimum, maximum) {
        var slider = Object.create(this);
        slider.initSlider(element, initialUnits, minimum, maximum);
        return slider;
    }
});

chapatt.ButtonGroup = Object.create(chapatt.Widget);
Object.assign(chapatt.ButtonGroup, chapatt.Emitter);
Object.assign(chapatt.ButtonGroup,
{
    buttonGroups: [],

    initButtonGroup: function(element) {
        this.initWidget(element);
        this.initEmitter();

        this.buttonGroups.push(this);

        this.addSignal('clicked');
        this.buttons = [];
        this.initButtons();

        this.element.addEventListener('mousedown', function(event)
        {
            event.preventDefault();
        });
    },

    initButtons: function() {
        var buttons = this.element.getElementsByClassName('button');
        for (var i = 0; i < buttons.length; i++) {
            this.buttons.push(buttons[i]);
            buttons[i].addEventListener('click', this.handleClick.bind(this, i));
        }
    },

    handleClick: function(buttonIndex) {
            this.signalEmit('clicked', buttonIndex);
    },

    new: function(element) {
        var buttonGroup = Object.create(this);
        buttonGroup.initButtonGroup(element);
        return buttonGroup;
    }
});
