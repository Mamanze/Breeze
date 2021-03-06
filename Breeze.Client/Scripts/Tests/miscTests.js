require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    
    var MetadataStore = breeze.MetadataStore;

    var Enum = core.Enum;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityType = breeze.EntityType;

    var newEm = testFns.newEm;

    module("misc", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });

    test("module with setup/teardown", function () {
        expect(1);
        ok(true);
    });

    test("backbone", function() {
        var Person = Backbone.Model.extend({});
        var aPerson = new Person();
        ok(aPerson instanceof Person);

    });
    
    test("date comparison", function () {
        var dt1 = new Date();
        var dt2 = new Date(dt1.getTime());
        ok(dt1 != dt2);
        ok(dt1 !== dt2);
        ok(dt1 >= dt2);
        ok(dt1 <= dt2);
        
    });

    test("iso date conversion", function() {
        var dt1 = new Date(Date.now());
        ok(core.isDate(dt1));
        var dt1AsString = dt1.toISOString();
        var dt1a = new Date(Date.parse(dt1AsString));
        // var dt1a = core.dateFromIsoString(dt1AsString);
        ok(dt1.getTime() === dt1a.getTime());
    });

    test("regex function matching", function() {
        var entity = new TestEntity();
        var ms = new MetadataStore();
        var mt = new EntityType(ms);
        
        var node0 = breeze.FnNode.create("CompanyName");
        var val0 = node0.fn(entity);
        ok(val0 == "Test Company 1");
        
        var node1 = breeze.FnNode.create("substring(toUpper(CompanyName), length('adfasdf'))");
        var val1 = node1.fn(entity);
        ok(val1 === 'MPANY 1');
        var url1 = node1.toOdataFragment(mt);

        var node2 = breeze.FnNode.create("substring(toUpper(toLower(CompanyName)), length('adfa,sdf'))");
        var val2 = node2.fn(entity);
        var url2 = node2.toOdataFragment(mt);
        
        var node3 = breeze.FnNode.create("substring(substring(toLower(CompanyName), length('adf,asdf')),5)");
        var val3 = node3.fn(entity);
        var url3 = node3.toOdataFragment(mt);

        var node4 = breeze.FnNode.create("substring(CompanyName, length(substring('xxxxxxx', 4)))");
        var val4 = node4.fn(entity);
        var url4 = node4.toOdataFragment(mt);
        
    });

    var TestEntity = function() {
        this.CompanyName = "Test Company 1";
        
    };
    
    TestEntity.prototype.getProperty = function(propName) {
        return this[propName];
    };
    
    

    test("dual purpose func and object", function () {
        var fn = function () {
        };
        var obj = {};
        obj["foo"] = fn;
        obj["foo"]["bar"] = 999;
        ok(999 === obj.foo.bar);
        ok(obj.foo() === undefined);
    });

    test("attaching a property to a string is a noop", function () {
        var foo = "abcd";
        foo.extra = "efgh";
        var extra = foo.extra;
        ok(extra === undefined);
    });


    test("createFromPrototype semantics", function () {
        var literal1 = { a: 1, b: 2 };
        var literal2 = { a: 999, b: 1000 };
        var proto = {
            nextId: 1,
            increment: function () {
                this.a = this.a + 1;
            }
        };
        var newLit1 = createFromPrototype(proto, literal1);
        var newLit2 = createFromPrototype(proto, literal2);
        newLit1.increment();
        ok(newLit1.a === 2);

    });

    test("createFromPrototype semantics2", function () {
        var p1Data = { age: 10, hair: "brown" };
        var p2Data = { age: 20, hair: "red" };


        var person = {
            nextId: 1,
            incrementAge: function () {
                this.age = this.age + 1;
            }
        };

        var male = {
            sex: "M"
        };

        var man = createFromPrototype(person, male);

        var man1 = createFromPrototype(man, p1Data);
        var man2 = createFromPrototype(man, p2Data);

        man1.incrementAge();
        ok(man1.age === 11);
        ok(man2.sex === "M");
        ok(man.isPrototypeOf(man1));
        ok(person.isPrototypeOf(man1));

    });

    function notest() {
    }

    test("Chrome defineProperty bug - bad behavior", function () {
        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        };

        var proto = Person.prototype;

        var earlyPerson = new Person("early", "person");

        function makePropDescription(propName) {
            return {
                get: function () {
                    return this["_" + propName];
                },
                set: function (value) {
                    this["_" + propName] = value.toUpperCase();
                },
                enumerable: true,
                configurable: true
            };
        }

        Object.defineProperty(proto, "firstName", makePropDescription("firstName"));
        ok(earlyPerson.firstName === "early");
        var p1 = new Person("jim", "jones");
        var p2 = new Person("bill", "smith");
        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");
    });

    test("IE 9 defineProperty bug - better workaround", function () {
        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        };

        var proto = Person.prototype;
        proto._pendingSets = [];
        proto._pendingSets.schedule = function (entity, propName, value) {
            this.push({ entity: entity, propName: propName, value: value });
            if (!this.isPending) {
                this.isPending = true;
                var that = this;
                setTimeout(function () { that.process(); });
            }
        };
        proto._pendingSets.process = function () {
            if (this.length === 0) return;
            this.forEach(function (ps) {
                if (!ps.entity._backingStore) {
                    ps.entity._backingStore = {};
                }
                ps.entity[ps.propName] = ps.value;
            });
            this.length = 0;
            this.isPending = false;
        };

        function makePropDescription(propName) {
            return {
                get: function () {
                    var bs = this._backingStore;
                    if (!bs) {
                        proto._pendingSets.process();
                        bs = this._backingStore;
                        if (!bs) return;
                    }
                    return bs[propName];
                },
                set: function (value) {
                    var bs = this._backingStore;
                    if (!bs) {
                        proto._pendingSets.schedule(this, propName, value);
                    } else {
                        bs[propName] = value ? value.toUpperCase() : null;
                    }
                },
                enumerable: true,
                configurable: true
            };
        }

        Object.defineProperty(proto, "firstName", makePropDescription("firstName"));

        var p1 = new Person("jim", "jones");
        // fails on next line
        var p2 = new Person("bill", "smith");
        var p3 = new Person();
        var p1name = p1.firstName;
        var p3name = p3.firstName;
        p3.firstName = "fred";

        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");


    });

    // change to test to see it crash in ie. - works in Chrome and FF.
    notest("IE 9 defineProperty bug - CRASH", function () {
        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        };

        var proto = Person.prototype;

        function makePropDescription(propName) {
            return {
                get: function () {
                    if (!this.backingStore) {
                        this.backingStore = {};
                    }
                    return this.backingStore[propName];
                },
                set: function (value) {
                    if (!this.backingStore) {
                        this.backingStore = {};
                    }
                    if (value) {
                        this.backingStore[propName] = value.toUpperCase();
                    }
                    ;
                },
                enumerable: true,
                configurable: true
            };
        }


        Object.defineProperty(proto, "firstName", makePropDescription("firstName"));

        var p1 = new Person("jim", "jones");
        // fails on next line
        var p2 = new Person("bill", "smith");
        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");


    });


    test("ie defineProperty bug - workaround", function () {
        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;

        };
        var proto = Person.prototype;

        var earlyPerson = new Person("early", "person");

        Object.defineProperty(proto, "firstName", makePropDescription("firstName"));
        proto._backups = [];

        function getBackingStore(obj) {
            // idea here is that we CANNOT create a new property on 'this' from
            // within property getter/setter code. IE has real issues with it.
            var bs = obj._backingStore;
            if (bs) return bs;
            var prt = Object.getPrototypeOf(obj);
            var backups = prt._backups;

            var matchingBackup = core.arrayFirst(backups, function (backup) {
                return backup.obj === obj;
            });
            if (matchingBackup) {
                bs = matchingBackup.backingStore;
            } else {
                bs = {};
                backups.push({ obj: obj, backingStore: bs });
            }
            if (backups.length > 3) {
                setTimeout(function () {
                    updateBackingStores(prt);
                }, 0);
            }
            return bs;
        }

        // needed for chrome.

        function startTracking(obj) {
            updateBackingStores(Object.getPrototypeOf(obj));
            // rest is needed for Chrome.
            if (obj._backingStore) return;
            obj._backingStore = {};
            Object.getOwnPropertyNames(obj).forEach(function (propName) {
                if (propName === '_backingStore') return;
                // next 3 lines insure any interception logic is hit.
                var value = obj[propName];
                delete obj[propName];
                obj[propName] = value;
            });
        }

        function updateBackingStores(proto) {
            if (proto._backups.length === 0) return;
            proto._backups.forEach(function (backup) {
                if (!backup.obj._backingStore) {
                    backup.obj._backingStore = backup.backingStore;
                }
            });
            proto._backups.length = 0;
        }

        function makePropDescription(propName) {
            return {
                get: function () {
                    var bs = getBackingStore(this);
                    return bs[propName];
                },
                set: function (value) {
                    var bs = getBackingStore(this);
                    if (value) {
                        bs[propName] = value.toUpperCase();
                    }
                },
                enumerable: true,
                configurable: true
            };
        }

        earlyPerson.firstName = "still early";
        ok(earlyPerson.firstName === "still early");

        var p1 = new Person("jim", "jones");

        var p1a = new Person();
        startTracking(p1);
        startTracking(p1a);
        p1a.firstName = "xxx";
        ok(p1a.firstName === "XXX");
        // used to fail on the next line 
        var p2 = new Person("bill", "smith");
        startTracking(p2);
        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");

        ok(p1a.firstName === "XXX");
        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");
    });


    test("funclet test", function () {

        var foos = [
            { id: 1, name: "Abc" },
            { id: 2, name: "def" },
            { id: 3, name: "ghi" }
        ];

        ok(foos[0] === core.arrayFirst(foos, core.propEq("name", "Abc")));
        ok(foos[2] === core.arrayFirst(foos, core.propEq("id", 3)));
    });

    test("enum test", function () {

        var proto = {
            isBright: function () { return this.toString().toLowerCase().indexOf("r") >= 0; },
            isShort: function () { return this.getName().length <= 4; }
        };

        var Color = new Enum("Color", proto);
        Color.Red = Color.addSymbol();
        Color.Blue = Color.addSymbol();
        Color.Green = Color.addSymbol();

        //    Color.RedOrBlue = Color.or(Color.Red, Color.Blue);
        //    var isB = Color.RedOrBlue.isBright();
        //    var getSymbols = Color.getSymbols();
        //    var name = Color.RedOrBlue.name();

        ok(Color.Red.isBright(), "Red should be 'bright'");
        ok(!Color.Blue.isBright(), "Blue should not be 'bright'");
        ok(!Color.Green.isShort(), "Green should not be short");

        var Shape = new Enum("Shape");
        Shape.Round = Shape.addSymbol();
        Shape.Square = Shape.addSymbol();

        ok(Shape.Round.isBright === undefined, "Shape.Round.isBright should be undefined");

        ok(Color instanceof Enum, "color should be instance of Enum");
        ok(Enum.isSymbol(Color.Red), "Red should be a symbol");
        ok(Color.contains(Color.Red), "Color should contain Red");
        ok(!Color.contains(Shape.Round), "Color should not contain Round");
        ok(Color.getSymbols().length === 3, "There should be 3 colors defined");

        ok(Color.Green.toString() == "Green", "Green.toString should be 'Green' was:" + Color.Green.toString());
        ok(Shape.Square.parentEnum === Shape, "Shape.Square's parent should be Shape");

    });
    
    test("enum test2", function () {

        var prototype = {
            nextDay: function () {
                var nextIndex = (this.dayIndex+1) % 7;
                return DayOfWeek.getSymbols()[nextIndex];
            }
        };

        var DayOfWeek = new Enum("DayOfWeek", prototype);
        DayOfWeek.Monday = DayOfWeek.addSymbol( { dayIndex: 0 });
        DayOfWeek.Tuesday = DayOfWeek.addSymbol( { dayIndex: 1 });
        DayOfWeek.Wednesday = DayOfWeek.addSymbol( { dayIndex: 2 });
        DayOfWeek.Thursday = DayOfWeek.addSymbol( { dayIndex: 3 });
        DayOfWeek.Friday = DayOfWeek.addSymbol( { dayIndex: 4 });
        DayOfWeek.Saturday = DayOfWeek.addSymbol( { dayIndex: 5, isWeekend: true });
        DayOfWeek.Sunday = DayOfWeek.addSymbol( { dayIndex: 6, isWeekend: true });
        DayOfWeek.seal();

      // custom methods
        ok(DayOfWeek.Monday.nextDay() === DayOfWeek.Tuesday);
        ok(DayOfWeek.Sunday.nextDay() === DayOfWeek.Monday);
        // custom properties
        ok(DayOfWeek.Tuesday.isWeekend === undefined);
        ok(DayOfWeek.Saturday.isWeekend == true);
        // Standard enum capabilities
        ok(DayOfWeek instanceof Enum);
        ok(Enum.isSymbol(DayOfWeek.Wednesday));
        ok(DayOfWeek.contains(DayOfWeek.Thursday));
        ok(DayOfWeek.Tuesday.parentEnum == DayOfWeek);
        ok(DayOfWeek.getSymbols().length === 7);
        ok(DayOfWeek.Friday.toString() === "Friday");
        var x = DayOfWeek.fromName("Tuesday");
        var y = DayOfWeek.fromName("xxx");

    });
    

    // return a new object that like the 'object' with ths prototype stuck in 'underneath'
    function createFromPrototype(prototype, obj) {
        var newObject = Object.create(prototype);
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                newObject[prop] = obj[prop];
            }
        }

        return newObject;
    };

    return testFns;
});