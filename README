ValidateJS
===

Validates the structure of JavaScript objects.

Why
---

As soon as you start using JavaScript on the server side, it becomes useful to
send JSON data between the server and client. However, you soon run into the
problem that the client might send you a JSON string that is valid (JSON.parse
wont't throw an error), but the returned JavaScript object doesn't have the
structure you expect:

    var obj = JSON.parse(body);
    var name = obj.name.trim();

This will work fine... as long as the _name_ property is a string. If you got a
number back, this will crash your Node process, as there is no _trim_ function
on the _Number.prototype_.

To get around this, you could surround everything with an try/catch but that
slows down the execution speed of your app as well as doesn't guarantee that
everything works as expected. If you expect to get back a non floating number,
but you got a floating number, things will work out, until you write the number
to a MySQL database, that expects to get an integer number and converts the
floating number to an integer one. E.g. you got the number _1.1_ and tested it
to be _1_, which is false of cause but then MySQL converts it to 1 again - that
can break your App's logic or even worse allows the user to hack your app.

Validate Your Input
---

This is where __ValidateJS__ comes in:

    var V = require("validate");
    [...]

    // Parse the JSON string to get an JavaScript object.
    var obj = JSON.parse(body);

    // Define the structure that the JavaScript object should have.
    var objStructure = V.Object({
        name: V.String
    });

    // Validate it.
    var valid = V.validate(obj, objStructure);

    // Let's see, if the object is valid.
    if (valid !== true) {
        // Hacking!
    } else {
        // Everyting is fine!
    }

Doing this kind of validation is fast and easy, but makes your app way more secure.

If you like using callbacks, you can also write:

    V.validate(obj, objStructure, function(err) { ... });

Documentation
---

At this point, there is no real documentation, but you can checkout the
**test.js** file, that contains the unit tests and has some comments + examples
that should make it easy to get started.

Currently, you can validate

* the types: **Object, Array, String, Number** (floating number + non floating
number), **Integer, Boolean**
* define **test** functions for properties
* declare that some properties are only expected in some cases (using the
**onlyIf** statement)
* turn strictMode on and off (on by default)

Testing
---

I've created this for a small side project of mine and tested it so far on the
project as well as using the unit tests in **test.js**. Expect to find bugs. By
now, this is tested on _NodeJS_, but you might be able to use this on modern
browsers as well.
