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

chapatt.ValueModel = {};
Object.assign(chapatt.ValueModel, chapatt.Emitter);
Object.assign(chapatt.ValueModel,
{
    initValueModel: function() {
        this.initEmitter();
        this.addSignal('valueChanged');
    },

    getValue: function() {
        return this.value;
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
