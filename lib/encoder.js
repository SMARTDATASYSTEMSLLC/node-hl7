var Hl7Encoder,
    _ = require('lodash');

function Encoder() {
    var COMPONENT_SEPARATOR, DEFAULT_SEPARATORS, FIELD_SEPARATOR, NEW_LINE;

    FIELD_SEPARATOR = '|';
    COMPONENT_SEPARATOR = '^';
    NEW_LINE = '\r';
    DEFAULT_SEPARATORS = "" + COMPONENT_SEPARATOR + "~\\&";

    function Hl7Encoder(options) {
        if (options != null ? options.NEW_LINE : void 0) {
            NEW_LINE = options.NEW_LINE;
        }
    }

    var encode = function(message) {
        var encodedMessage, segments;
        segments = encodeAllObjectPropertiesAsSegments(message);
        encodedMessage = segments.join(NEW_LINE);
        return encodedMessage;
    };

    var encodeAllObjectPropertiesAsSegments = function(object) {
        var segmentName, value, _results;
        _results = [];
        for (segmentName in object) {
            if (segmentName === '$'){
                continue;
            }
            if (!_.isArray(object[segmentName])){
                object[segmentName] = [object[segmentName]];
            }
            _.each(object[segmentName], function(value){
                _results.push(encodeSegment(segmentName, value));
            });
        }
        return _results;
    };

    var encodeSegment = function(name, segment) {
        if (name === 'MSH') {
            if (!segment['MSH.1']) {
                segment['MSH.1'] = DEFAULT_SEPARATORS;
            }
        }
        segment = name + joinAllFieldsInSparseArrayIntoASingleLine(segment, name);
        return segment;
    };

    var joinAllFieldsInSparseArrayIntoASingleLine = function(fields, name) {
        if (_.isString(fields)){
            return fields;
        }

        var len = _(fields).keys().max(function (k){ return parseInt(k.split('.').pop(), 10);});
        len = parseInt((len+"").split('.').pop(),10);
        var result = '';
        if (!len || len < 2) {
            return result;
        }

        for (var i = 1; i <= len; i++){
            result += FIELD_SEPARATOR;
            result += encodeField(fields[name + '.' + i], name + '.' + i);
        }
        return result;
    };

    var encodeField = function(value, name) {
        var result = [];
        if (!value) {
            return '';
        }
        if (_.isString(value)) {
            return value;
        }else{
            _.each(value, function (val){
                var len = _(val).keys().max(function (k){ return parseInt(k.split('.').pop(), 10);});
                len = parseInt((len+"").split('.').pop(),10);
                for (var i = 1; i <= len; i++){
                    if (_.isString(val[name + '.' + i]) || !val[name + '.' + i]){
                        result.push(val[name + '.' + i] || "");
                    }else{
                        _.each(val[name + '.' + i], function (subvalue){
                            result.push(subvalue);
                        });
                    }
                }
            });
            return result.join(COMPONENT_SEPARATOR);
        }
    };

    return {
        encode: encode,
        encodeSegment: encodeSegment,
        encodeField: encodeField
    };

};

module.exports = Encoder;
