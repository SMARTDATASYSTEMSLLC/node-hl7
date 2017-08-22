"use strict";

const _ = require('lodash');

class Encoder2 {
    FIELD_SEPARATOR = '|';
    COMPONENT_SEPARATOR = '^';
    SUBCOMPONENT_SEPARATOR = '&';
    REPEAT_SEPARATOR = '~';
    NEW_LINE = '\r';
    DEFAULT_SEPARATORS = "" + COMPONENT_SEPARATOR + REPEAT_SEPARATOR + "\\" + SUBCOMPONENT_SEPARATOR;

    constructor(options) {
        if (options === null ? void 0 : options.NEW_LINE) {
            this.NEW_LINE = options.NEW_LINE;
        }
    }

    encode (message) {
        let encodedMessage, segments;
        segments = this.encodeAllObjectPropertiesAsSegments(message);
        encodedMessage = String.fromCharCode(0x0b) + segments.join(this.NEW_LINE) + String.fromCharCode(0x0d, 0x1c, 0x0d);
        return encodedMessage;
    };

    encodeAllObjectPropertiesAsSegments (object) {
        let results = [];

        _.each(object, (val, name) => {
            if (name === '$') {
                return;
            }
            if (!_.isArray(val)) {
                val = [val];
            }
            _.each(val, value => {
                results.push(this.encodeSegment(name, value));
            });
        });

        return results;
    };

    encodeSegment (name, segment) {
        if (name === 'MSH') {
            if (!segment['MSH.2']) {
                segment['MSH.2'] = this.DEFAULT_SEPARATORS;
            }
            return name + this.joinAllFieldsInSparseArrayIntoASingleLine(segment, name).substr(1);
        } else {
            return name + this.joinAllFieldsInSparseArrayIntoASingleLine(segment, name);
        }
    };

    joinAllFieldsInSparseArrayIntoASingleLine (fields, name) {
        if (_.isString(fields)) {
            return fields;
        }

        let len = _(fields).keys().max(function (k) { return parseInt(k.split('.').pop(), 10);});
        len = parseInt((len + "").split('.').pop(), 10);
        let result = '';
        if (!len || len < 2) {
            return result;
        }

        for (let i = 1; i <= len; i++) {
            result += this.FIELD_SEPARATOR;
            result += this.encodeField(fields[name + '.' + i], name + '.' + i);
        }
        return result;
    };

    encodeField (value, name) {
        const result = [];
        if (!value) {
            return '';
        }
        if (_.isString(value)) {
            return value;
        } else {
            _.each(value, function (val) {
                let len = _(val).keys().max(function (k) { return parseInt(k.split('.').pop(), 10);});
                len = parseInt((len + "").split('.').pop(), 10);
                const components = [];

                for (let i = 1; i <= len; i++) {
                    if (_.isString(val[name + '.' + i]) || !val[name + '.' + i]) {
                        components.push(val[name + '.' + i] || "");
                    } else {
                        components.push(_.map(val[name + '.' + i], function (subvalue) {
                            return subvalue;
                        }).join(this.SUBCOMPONENT_SEPARATOR));
                    }
                }
                result.push(components.join(this.COMPONENT_SEPARATOR));

            });
            return result.join(this.REPEAT_SEPARATOR);
        }
    }

}

module.exports = Encoder2;
