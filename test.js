/**
 * At the point of writing, there is no real documentation of ValidateJS but I
 * hope these tests can give a starting point on how to use it.
 */

var V = require("./validate");

var obj, arr, struct;

/** ===========================================================================
 * A damm simple test function that calls the V.validate function and checks if
 * the result matchs the expectations.
 */
var V_ERROR_NONE = 0;
var testCount = 0;
var testPassed = 0;
function test(obj, struct, errorKind, testName) {
    var res, callbackErr, passed = false;

    testCount ++;
    res = V.validate(obj, struct, function(err) {
        callbackErr = err;
    });

    if ((res === true && callbackErr) || (res !== true && res !== callbackErr)) {
        console.error("--> Failed: Result and callback don't match!");
        return;
    }
    if (res === true) {
        passed = errorKind == V_ERROR_NONE;
    } else {
        passed = errorKind == res.kind;
    }
    if (!passed) {
        console.error("--> Failed: ", testName, "- Error:", res.msg,
                                               "- Stack:", res.stack);
    } else {
        console.log("Passed: ", testName);
        testPassed++;
    }
}

/** ===========================================================================
 * This is the object/array we want to validate.
 */
obj = {
    id:     1,
    action: "insert",
    admin: true
};

arr = [{
    id:     1,
    action: "insert",
    text:   "foo bar"
}, {
    id:     2,
    action: "update",
    region: 144
}];

// At the beginning, turn off strictMode - more about it later.
V.strictMode = false;

/** ===========================================================================
 * You can validate each property on its own, but that's borring. See below!
 *
 * General speaking, V.validate returns 'true' if everyting is fine and
 * 'V.TypeError', 'V.TestError' or 'V.StrictError' if something failed.
 * If something is wrong with the passed in structure, V.validate will throw
 * an error. You can also pass a callback as third argument to V.validate.
 */
console.log("== Simple validation == ");

test(obj, V.Object, V_ERROR_NONE, "Object");
test(arr, V.Array,  V_ERROR_NONE, "Array");

test(obj.id, V.Number, V_ERROR_NONE, "Number");
test(obj.admin, V.Boolean, V_ERROR_NONE, "Boolean");
test(obj.action, V.String, V_ERROR_NONE, "String");

test(obj.session, V.String, V.ERROR_TYPE, "Non existing string");

// NaN is not a number!
test(NaN, V.Number, V.ERROR_TYPE, "NaN is not a number");
test(NaN, V.Integer, V.ERROR_TYPE, "NaN is not an integer");

// You can also test numbers for beeing integers aka non floating numbers.
test(10, V.Integer, V_ERROR_NONE, "Integer 1");
test(10.1, V.Integer, V.ERROR_TYPE, "Integer 2");

// V.Number etc. are just shortcuts for { type: "number" } etc.:
test(obj.id, {
    type: "number"
}, V_ERROR_NONE, "Number non shortcut form");

// This is an example where V.validate throws an error - the type is missing.
testCount++;
var caught = false;
try {
    V.validate(obj.action, {})
} catch(e) {
    caught = true;
}

if (caught) {
    testPassed ++;
    console.log("Passed", "Invalid structure passed in");
} else {
    console.error("--> Failed ", "There should be an error...");
}

/** ===========================================================================
 * You can validate more complex object/arrays as well by using the
 * 'properties', 'each' and 'eachObject' syntax.
 */
console.log("== 'Nested' object/array ==");

test(obj, {
    type: "object",
    properties: {
        id:     V.Integer,
        action: V.String
    }
}, V_ERROR_NONE, "Properties of object");

test(arr, {
    type: "array",
    each: {
        type: "object",
        properties: {
            id:     V.Integer,
            action: V.String
        }
    }
}, V_ERROR_NONE, "Properties of array");

// Same as above, but using the eachObject shortcut.
test(arr, {
    type: "array",
    eachObject: {
        id:     V.Integer,
        action: V.String
    }
}, V_ERROR_NONE, "Properties of array shortcut");

/** ===========================================================================
* The types 'object" and "array" can be left out if 'properties', 'each' or
* 'eachObject' is arround.
*/
console.log("== AutoType ==");

test(obj, {
    properties: {
        id: V.Integer
    }
}, V_ERROR_NONE, "Object");

test(arr, {
    each: {
        properties: {
            id: V.Integer
        }
    }
}, V_ERROR_NONE, "Array");

/** ===========================================================================
 * The V.String takes some argumtens for testing the length of a string.
 * You can also define custom test functions using the 'test' property. If
 * your test fails, you should return a new V.TestError.
 */
console.log("== Test functions ==");

test("foo bar", V.String(4), V_ERROR_NONE,
    "Build in string test function minLength 1");
test("foo",     V.String(4), V.ERROR_TEST,
    "Build in string test function minLength 2");
test("foo bar",     V.String(4, 7), V_ERROR_NONE,
    "Build in string test function maxLength 1");
test("foo bar foo", V.String(4, 7), V.ERROR_TEST,
    "Build in string test function maxLength 2");

struct = {
    type: "integer",
    test: function(obj, values, stack) {
        if (obj > 144) {
            return true;
        } else {
            return new V.TestError(
                    obj, stack, "The number has to be bigger then 144!");
        }
    }
};
test(144, struct, V.ERROR_TEST /* Will fail */, "Custom test 1");
test(145, struct, V_ERROR_NONE /* Will pass */, "Custom test 2");

/** ===========================================================================
 * Sometimes, there are only properties in some cases. E.g. in the "insert"
 * action a 'text' has to be passed in, but if the 'action' is 'update', a
 * 'region' property is expected. This can be validated using the 'onlyIf'
 * statement.
 * The 'values' object passed to the 'onlyIf' function holds the value of the
 * properties seen before on the object. 'obj' is the current object for this
 * property. You can store a object on 'values' using the 'name' property.
 * The 'stack' value contains the current stack until the current
 * object for validation is reached.
 */
console.log("== OnlyIf ==");

test(arr, {
    name: 'someArray',
    eachObject: {
        id:     V.Integer,
        action: V.String,
        text: {
            type:   "string",
            onlyIf: function(obj, values, stack) {
                console.log(">> Debug values.someArray.length =",
                            values.someArray.length);
                return values.action == "insert";
            }
        },
        region: {
            type:   "integer",
            onlyIf: function(obj, values, stack) {
                return values.action == "update";
            }
        }
    }
}, V_ERROR_NONE, "Properties of object");

/** ===========================================================================
 * V.is is useful to test a property for some given values.
 */
console.log("== V.is ==");

test(arr, {
    eachObject: {
        action: V.is("insert", "update")
    }
}, V_ERROR_NONE, "V.is 1");

test(arr, {
    eachObject: {
        id: V.is(1, 2)
    }
}, V_ERROR_NONE, "V.is 2");

/** ===========================================================================
 * V.isIn is useful to test a proeprty to be contained in an array or object.
 */
console.log("== V.isIn ==");

test(obj, {
    properties: {
        action: V.isIn(["insert", "update"])
    }
}, V_ERROR_NONE, "V.isIn 1");

test(arr, {
    eachObject: {
        action: V.isIn({
            "insert": true,
            "update": true
        })
    }
}, V_ERROR_NONE, "V.isIn 2");

/** ===========================================================================
 * Right, the syntax with these 'properties' and 'eachObject' stuff is way to
 * much - just use the V.Object and V.Array shortcut instead.
 */
console.log("== Shortcuts ==");

test(obj, V.Object({
    action: V.is("insert")
}), V_ERROR_NONE, "V.Object(properties)");

test(arr, V.Array({
    action: V.is("insert", "update")
}), V_ERROR_NONE, "V.Array(properties)");

/** ===========================================================================
 * Let's talk about the strict mode mentioned above. 'V.strictMode' is turned
 * on by default. If turned on, all properties of the object passed for
 * validation have to be validated. If there are more properties on the object
 * then defined by the structure a V.StrictError is returned.
 */
console.log("== StrictMode ==");

// Turn strictMode back on.
V.strictMode = true;

// This won't pass, as we don't validate all properties on the object.
test(obj, V.Object({
    action: V.is("insert")
}), V.ERROR_STRICT /*FAIL*/, "Test 1");

// Now we validate all properties.
test(obj, V.Object({
    id:     V.Integer,
    action: V.is("insert"),
    admin:  V.Boolean
}), V_ERROR_NONE /*PASS*/, "Test 2");

// OnlyIf with strictMode.
test(arr, V.Array({
    id:     V.Integer,
    action: V.String,
    text: {
        type:   "string",
        onlyIf: function(obj, values, stack) {
            return values.action == "insert";
        }
    },
    region: {
        type:   "integer",
        onlyIf: function(obj, values, stack) {
            return values.action == "update";
        }
    }
}), V_ERROR_NONE, "Test 3");

// This will fail, as we validate the 'action' property only if id == 1, but the
// array has an entry with id == 144 and the property 'action' as well.
test(arr, V.Array({
    id:     V.Integer,
    action: {
        type: "string",
        onlyIf: function(obj, values, stack) {
            return values.id == 1;
        }
    },
    text: {
        type:   "string",
        onlyIf: function(obj, values, stack) {
            return values.action == "insert";
        }
    },
    region: {
        type:   "integer",
        onlyIf: function(obj, values, stack) {
            return values.action == "update";
        }
    }
}), V.ERROR_STRICT /*FAIL*/, "Test 4");

/** ===========================================================================
 * Let's hope all tests passed!
 */
console.log(">>> Test passed:", testPassed, "/", testCount);
