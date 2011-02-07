// ValidateJS 0.1.0
// (c) 2011 Julian Viereck
// ValidateJS is freely distributable under the MIT license.

var V = exports;
var ONLY_IF_MISMATCH = {};

V.strictMode = true;

/* ============================================================================
* The magic V.validate function.
*/

/**
 * Valides a given object by using a expected structure of the object.
 * The callback is optional.
 */
V.validate = function(obj, structure, callback) {
    var stack = [ "obj" ];
    var values = {};
    var err = $valid(obj, structure, stack, values);
    if (err === ONLY_IF_MISMATCH && V.strictMode) {
        err = new V.StrictError(obj, stack, "StrictMode: Nothing was " +
            "validated due to mismatch of onlyIf");
    }

    // If a callback is given, then call it and pass in the error object if
    // there is one.
    if (callback) {
        if (err !== true) {
            callback(err);
        } else {
            callback();
        }
    }
    return err;
};

/**
 * Each structure can contain an array. This functions calls $subValid on each
 * structure item.
 */
function $valid(obj, struct, stack, values) {
    if (!V.isArray(struct)) {
        struct = [ struct ];
    }

    var err;
    for (var i = 0; i < struct.length; i++) {
        err = $subValid(obj, struct[i], stack, values);
        if (err === true) {
            return true;
        } else if (err !== ONLY_IF_MISMATCH) {
            return err;
        }
    }
    return err;
}

/**
 * This does the main validation job.
 */
function $subValid(obj, struct, stack, values) {
    if (struct.$default) {
        struct = struct.$default;
    }

    // Is a type set? In some cases a type is assumed, otherwise throw an error.
    if (!struct.type) {
        if (struct.properties) {
            struct.type = "object";
        } else if (struct.each || struct.eachObject) {
            struct.type = "array";
        } else {
            throw "Type needed";
        }
    }

    // If there is a name field, then store the obj value.
    if (struct.name) {
        values[struct.name] = obj;
    }

    // If there is a "onlyIf" function, then test it.
    if (struct.onlyIf) {
        if (!struct.onlyIf(obj, values, stack)) {
            return ONLY_IF_MISMATCH;
        }
    }

    // Test if the type matches.
    var types = struct.type.split("|");
    var match = types.some(function(type) {
        if (type === "any") {
            return true;
        }
        if (!(type in $validObj)) {
            throw "Unkown type" + type;
        }
        return $validObj[type](obj);
    });

    if (!match) {
        return new V.TypeError(obj, stack, "Type mismatch: " + struct.type);
    }

    var err;
    // Execute the test function if there is one.
    if (struct.test) {
        err = struct.test(obj, values, stack);
        if (err !== true) {
            return err;
        }
    }

    // Check properties of obj.
    if (struct.properties) {
        var validatedProperties = [];
        for (var prop in struct.properties) {
            stack.push(prop);
            // Store the object on the values object.
            values[prop] = obj[prop];
            err = $valid(obj[prop], struct.properties[prop], stack, values);
            stack.pop();

            if (err === true) {
                validatedProperties.push(prop);
            } else if (err !== ONLY_IF_MISMATCH) {
                return err;
            }
        }

        // In strictMode, all properties have to be checked.
        if (V.strictMode &&
            !V.Array.isSame(validatedProperties, Object.keys(obj))) {
            return new V.StrictError(obj, stack,
                "StrictMode: Not all properties of the object have been " +
                "validated. Validated '" + validatedProperties.join(", ") +
                "' but there are the properties '" +
                Object.keys(obj).join(", ") + "'");
        }
    }
    // If we are in strictMode and obj is an object but no properties are in the
    // structure to test agains, then return an error.
    else if (V.strictMode && V.isObject(obj)) {
        return new V.StrictError(obj, stack,
            "StrictMode: Got an object but no properties " +
            "are defined in the structure for validation");
    }

    // There can only be an 'each' OR an 'eachObject" but never both.
    if (struct.each && struct.eachObject) {
        throw "Got 'each' and 'eachObject' but can deal only one of them";
    }

    // If there is a 'eachObject' convert it to an 'each' one.
    if (struct.eachObject) {
        struct.each = {
            type: "object",
            properties: struct.eachObject
        };
        // Remove 'eachObject' from the structure as the structure might be
        // reused later and both each and eachObject is not allowed side by side.
        delete struct.eachObject;
    }

    // Check each item of the array.
    if (struct.each) {
        if (struct.type != "array") {
            throw "struct.each only makes sense for type array, not " +
                struct.type;
        }

        for (var i = 0; i < obj.length; i++) {
            stack.push(i);
            err = $valid(obj[i], struct.each, stack, values);
            stack.pop();
            if (err !== true) {
                return err;
            }
        }
    }
    return true;
}

/* ============================================================================
 * Basic error class.
 */

V.ERROR_TYPE = 1;
V.ERROR_TEST = 2;
V.ERROR_STRICT = 3

var Error = function(obj, stack, msg) {
    this.stack = stack.join(".");
    this.obj = obj;
    this.msg = msg;
};

V.TypeError = function(obj, stack, msg) {
    Error.prototype.constructor.call(this, obj, stack, msg);
}

V.TypeError.prototype.kind = V.ERROR_TYPE;

V.TestError = function(obj, stack, msg) {
    Error.prototype.constructor.call(this, obj, stack, msg);
}
V.TestError.prototype.kind = V.ERROR_TEST;

V.StrictError = function(obj, stack, msg) {
    Error.prototype.constructor.call(this, obj, stack, msg);
}
V.StrictError.prototype.kind = V.ERROR_STRICT;

/* ============================================================================
 * Shortcuts
 */

V.is = function() {
    var arr = [];
    for (var i = 0; i < arguments.length; i++) {
        arr.push(arguments[i]);
    }

    return  {
        type: "any",
        test: function(obj, values, stack) {
            if (arr.indexOf(obj) == -1) {
                return new V.TestError(obj, stack,
                    "Expected any of the values '" +
                    arr.join(", ") + "' but got '" + obj + "'");
            } else {
                return true;
            }
        }
    }
};

V.isIn = function(inObj) {
    var structure = {
        type: "any"
    };

    if (V.isArray(inObj)) {
        structure.test = function(obj, values, stack) {
            if (inObj.indexOf(obj) == -1) {
                return new V.TestError(obj, stack,
                    "Expected any of the values '" +
                    inObj.join(", ") + "' but got '" + obj + "'");
            } else {
                return true;
            }
        }
    }
    else if (V.isObject(inObj)) {
        structure.test = function(obj, values, stack) {
            if (obj in inObj) {
                return true;
            } else {
                return new V.TestError(obj, stack,
                    "Expected any of the values '" +
                    Object.keys(inObj).join(", ") + "' but got '" + obj + "'");
            }
        }
    }
    else {
        throw "Expected array or object passed to V.isIn";
    }
    return structure;
};

V.String = function(minLength, maxLength) {
    var argIdx = 0;
    var argsLen = arguments.length;
    var structure = {
        type: "string"
    };

    structure.test = function(obj, values, stack) {
        if (obj.length < minLength) {
            return new V.TestError(obj, stack, "MinLength failed :" +
                                obj.length + " but minimum is " + minLength);
        } else if (maxLength && obj.length > maxLength) {
            return new V.TestError(obj, stack, "MaxLength failed :" +
                                obj.length + " but maximum is " + maxLength);
        } else {
            return true;
        }
    }

    return structure;
};

V.String.$default = {
    type: "string"
};

V.Boolean = {
    type: "boolean"
};

V.Number = {
    type: "number"
};

V.Int = {
    type: "int"
}

V.Object = function(properties) {
    return {
        type: "object",
        properties: properties
    };
};

V.Object.$default = {
    type: "object"
};

V.Array = function(eachObjectProperties) {
    return {
        type: "array",
        eachObject: eachObjectProperties
    };
};

V.Array.$default = {
    type: "array"
};

V.Array.isSame = function(a, b) {
    if (a.length != b.length) {
        return false;
    }
    for (var i = 0; i < a.length; i++) {
        if (a.indexOf(b[i]) == -1) {
            return false;
        }
    }
    return true;
}

/* ============================================================================
 * Functions to determ the type of an object.
 */

V.isBoolean = function(obj) {
    return (typeof obj) === "boolean";
};

V.isString = function(obj) {
    return (typeof obj) === "string";
};

V.isNumber = function(obj) {
    return (typeof obj) === "number" && !isNaN(obj);
};

V.isInt = function(obj) {
    return V.isNumber(obj) && (obj % 1 == 0);
}

V.isArray = function(obj) {
    return Array.isArray(obj);
};

V.isObject = function(obj) {
    return (typeof obj) === "object" && !V.isArray(obj);
};

$validObj = {
    boolean: V.isBoolean,
    string:  V.isString,
    number:  V.isNumber,
    int:     V.isInt,
    object:  V.isObject,
    array:   V.isArray
};
