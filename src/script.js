var Example = Example || {};

Example.timescale = function() {
    try {
        if (typeof MatterWrap !== 'undefined') {
            Matter.use('matter-wrap');
        } else {
            Matter.use(require('matter-wrap'));
        }
    } catch (e) {
        // could not require the plugin or install needed
    }

    var Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Body = Matter.Body,
        Events = Matter.Events,
        Composite = Matter.Composite,
        Composites = Matter.Composites,
        Common = Matter.Common,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        Bodies = Matter.Bodies;

    // Letters for random bodies
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Get dimensions
    var width = window.innerWidth;
    var height = window.innerHeight;
    var currentX = width * 0.1;
    var charWidth = 60;

    // create engine
    var engine = Engine.create({
        timing: {
            timeScale: 1
        }
    });
    var world = engine.world;

    // create renderer
    var render = Render.create({
        element: document.getElementById('landing'),
        engine: engine,
        options: {
            width: width,
            height: height,
            showAngleIndicator: false,
            showCollisions: false,
            showVelocity: false,
            wireframes: false,
            background: '#000',
            pixelRatio: 'auto'
        }
    });

    var mouse = Mouse.create(render.canvas);

    Render.run(render);

    // create runner
    var runner = Runner.create();
    Runner.run(runner, engine);

    // add bodies (walls for full screen)
    Composite.add(world, [
        Bodies.rectangle(width / 2, 0, width, 50, { 
            isStatic: true,
            render: { fillStyle: '#000' }
        }),
        Bodies.rectangle(width / 2, height, width, 50, { 
            isStatic: true,
            render: { fillStyle: '#000' }
        }),
        Bodies.rectangle(width, height / 2, 50, height, { 
            isStatic: true,
            render: { fillStyle: '#000' }
        }),
        Bodies.rectangle(0, height / 2, 50, height, { 
            isStatic: true,
            render: { fillStyle: '#000' }
        })
    ]);

    // Ball pool physics will be applied to typed letters only

    var bodyOptions = {
        frictionAir: 0.005,
        friction: 0.001,
        restitution: 0.9,
        render: {
            fillStyle: '#000',
            strokeStyle: '#000',
            lineWidth: 2
        },
        chamfer: { radius: 8 }
    };

    var wordBodies = [];

    var explosion = function(engine, delta) {
        var timeScale = (1000 / 60) / delta;
        var bodies = Composite.allBodies(engine.world);

        for (var k = 0; k < bodies.length; k++) {
            var body = bodies[k];

            if (!body.isStatic) {
                // scale force for mass and time applied
                var forceMagnitude = (0.02 * body.mass) * timeScale;

                var wordIndex = wordBodies.indexOf(body);
                if (wordIndex !== -1 || body.position.y >= height - 100) {
                    // Apply random gentle scatter force
                    Body.applyForce(body, body.position, {
                        x: (forceMagnitude * 0.5 + Common.random() * forceMagnitude) * Common.choose([1, -1]),
                        y: -forceMagnitude * Common.random(0.2, 0.8) + Common.random() * -forceMagnitude * 0.5
                    });
                }
            }
        }
    };

    var timeScaleTarget = 1,
        lastTime = Common.now();

    Events.on(engine, 'afterUpdate', function(event) {
        var timeScale = (event.delta || (1000 / 60)) / 1000;

        // tween the timescale for bullet time slow-mo
        if (mouse.button === -1) {
            engine.timing.timeScale += (timeScaleTarget - engine.timing.timeScale) * 3 * timeScale;
        } else {
            engine.timing.timeScale = 1;
        }

        // every 2 sec (real time)
        if (Common.now() - lastTime >= 2000) {

            // flip the timescale
            if (timeScaleTarget < 1) {
                timeScaleTarget = 1;
            } else {
                timeScaleTarget = 0.05;
            }

            // create some random forces
            explosion(engine, event.delta);

            // update last time
            lastTime = Common.now();
        }

        // Check for balloon bodies to remove if off-screen
        for (var i = wordBodies.length - 1; i >= 0; i--) {
            var body = wordBodies[i];
            if (body.gravityScale < 0 && body.position.y < -50) {
                Composite.remove(world, body);
                wordBodies.splice(i, 1);
            }
        }
    });

    var resetScene = function() {
        var bodies = Composite.allBodies(world);
        for (var i = bodies.length - 1; i >= 0; i--) {
            if (!bodies[i].isStatic) {
                Composite.remove(world, bodies[i]);
            }
        }
        wordBodies = [];
        currentX = width * 0.1;
    };

    // Keyboard trigger for adding letters
    document.addEventListener('keydown', function(e) {
        var key = e.key.toUpperCase();
        if (e.key === ' ') {
            // Handle space: advance position without adding body
            currentX += charWidth * 1.5;
            if (currentX > width - 50) {
                currentX = width * 0.1;
            }
            e.preventDefault();
            return;
        }
        if (e.key === 'Backspace') {
            if (wordBodies.length > 0) {
                var lastBody = wordBodies.pop();
                lastBody.gravityScale = 0;
                Body.applyForce(lastBody, lastBody.position, {
                    x: 0,
                    y: -0.005 * lastBody.mass
                });
                Body.setVelocity(lastBody, {
                    x: lastBody.velocity.x + Common.random(-1, 1),
                    y: lastBody.velocity.y - 10
                });
                lastBody.frictionAir = 0.01;
                lastBody.render.fillStyle = '#000';
            }
            e.preventDefault();
            return;
        }
        if (letters.includes(key)) {
            var body = Bodies.rectangle(currentX, height * 0.3, charWidth * 0.7, charWidth * 1.1, bodyOptions);
            body.label = key;
            body.gravityScale = 1;
            
            var colors = ['#000', '#000', '#000', '#000', '#000'];
            body.render.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            
            Composite.add(world, body);
            wordBodies.push(body);
            currentX += charWidth + 10;
            if (currentX > width - 50) {
                currentX = width * 0.1;
            }
        }
    });

    // Draw letters on the bodies
    Events.on(render, 'afterRender', function() {
        var ctx = render.context;
        var bodies = Composite.allBodies(engine.world);

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            if (!body.isStatic && body.label) {
                ctx.save();
                ctx.translate(body.position.x, body.position.y);
                ctx.rotate(body.angle);
                if (body.label.length > 1) {
                    ctx.font = `bold ${Math.min(width * 0.1, 120)}px Arial`;
                } else {
                    ctx.font = `bold ${Math.min(width * 0.09, 110)}px Arial`;
                }
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(body.label, 0, 0);
                ctx.restore();
            }
        }
    });

    // add mouse control (with ballPool stiffness)
    var mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2, // Ball pool stiffness value
            render: {
                visible: false
            }
        }
    });

    Composite.add(world, mouseConstraint);

    // keep the mouse in sync with rendering
    render.mouse = mouse;

    // fit the render viewport to the scene
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: width, y: height }
    });

    // wrapping using matter-wrap plugin
    var allBodies = Composite.allBodies(world);

    for (var i = 0; i < allBodies.length; i += 1) {
        if (!allBodies[i].isStatic) {
            allBodies[i].plugin.wrap = {
                min: { x: render.bounds.min.x - 100, y: render.bounds.min.y },
                max: { x: render.bounds.max.x + 100, y: render.bounds.max.y }
            };
        }
    }

    // Handle resize
    window.addEventListener('resize', function() {
        width = window.innerWidth;
        height = window.innerHeight;
        render.canvas.width = width;
        render.canvas.height = height;
        render.options.width = width;
        render.options.height = height;
        Render.setPixelRatio(render, 'auto');
        Render.lookAt(render, {
            min: { x: 0, y: 0 },
            max: { x: width, y: height }
        });
        
        // Update walls
        var walls = [
            Bodies.rectangle(width / 2, 0, width, 50, { 
                isStatic: true,
                render: { fillStyle: '#000' }
            }),
            Bodies.rectangle(width / 2, height, width, 50, { 
                isStatic: true,
                render: { fillStyle: '#000' }
            }),
            Bodies.rectangle(width, height / 2, 50, height, { 
                isStatic: true,
                render: { fillStyle: '#000' }
            }),
            Bodies.rectangle(0, height / 2, 50, height, { 
                isStatic: true,
                render: { fillStyle: '#000' }
            })
        ];
        
        var oldBodies = Composite.allBodies(world).filter(b => b.isStatic && (b.position.y === 0 || b.position.y === height || b.position.x === 0 || b.position.x === width));
        for (var w = 0; w < oldBodies.length; w++) {
            Composite.remove(world, oldBodies[w]);
        }
        Composite.add(world, walls);
        currentX = width * 0.1;
    });

    return {
        engine: engine,
        runner: runner,
        render: render,
        canvas: render.canvas,
        stop: function() {
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
        }
    };
};

Example.timescale.title = 'Physics Playground with Ball Pool';
Example.timescale.for = '>=0.14.2';

if (typeof module !== 'undefined') {
    module.exports = Example.timescale;
}

// Initialize the demo
Example.timescale();