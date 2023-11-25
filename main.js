window.onload = main;
function main() {
        // CANVAS CREATION
        const canvas = document.getElementById("screen");
        /** @type {CanvasRenderingContext2D} */
        const context = canvas.getContext('2d');

        canvas.width = 800;
        canvas.height = 800;

        // VECTOR FUNCTIONS        
        function vecAdd(a, b) {
                return a.map((aValue, idx) => (aValue + b[idx]))
        }
        function vecDist(a, b) {
                return Math.sqrt(a.reduce((prev, cur, idx) => prev + Math.pow((cur - b[idx]), 2), 0))
        }
        
        function vecScale(a, s) {
                return a.map((aValue) => (aValue * s))
        }
        
        function vecMidpoint() {
                let summation = Array.apply(null, Array(arguments.length)).map(() => 0);
                for (let i = 0; i < arguments.length; ++i) {
                        summation = vecAdd(summation, arguments[i]);
                }
                
                return vecScale(summation, 1 / arguments.length);
        }

        // BOARD INITIALIZATION
        let canvasCenter = [canvas.width / 2, canvas.height / 2]
        let v1 = [1, 0];
        let v2 = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)]

        let radius = 50;
        let diameter = radius * 2;
        let clickableRadius = radius - (radius / 8); // pretty good approximation for the hexigon shape
        let bound = 4

        let hexagonCenterPoints = [];

        for (let i = 0; i < bound; ++i) {
                let firstValues = Array.from(new Set([i, -i]));
                for (let ii = 0; ii < 50; ++ii) {
                        latticePoints = [...firstValues.map((value) => vecAdd(vecAdd( vecScale(v1, value * diameter), vecScale(v2, ii * diameter) ), canvasCenter))]
                        if (ii) {
                                latticePoints.push(...firstValues.map((value) => vecAdd(vecAdd( vecScale(v1, value * diameter), vecScale(v2, -ii * diameter) ), canvasCenter)))
                        }

                        latticePoints.forEach((point) => {
                                if (vecDist(canvasCenter, point) <= radius * 6) {
                                        hexagonCenterPoints.push(point);
                                }
                        })
                }
        }

        function compare(a, b) {
                if (a[1] == b[1]) {
                        return a[0] - b[0]
                }
                return a[1] - b[1];
        }
        hexagonCenterPoints.sort(compare);

        // hexagons surrounding board
        let invalidPointIndices = [0, 1, 2, 3, 4, 8, 9, 14, 15, 21, 22, 27, 28, 32, 33, 34, 35, 36]
        let validPointIndexBoundary = invalidPointIndices.length + 1;

        let validPoints = [];
        let invalidPoints = [];

        for (let i = 0; i < hexagonCenterPoints.length; ++i) {
                if (invalidPointIndices.includes(i)) {
                        invalidPoints.push(hexagonCenterPoints[i]);
                } else {
                        validPoints.push(hexagonCenterPoints[i]);
                }
        }

        hexagonCenterPoints = validPoints;
        hexagonCenterPoints.push(...invalidPoints)


        let board = {locations: hexagonCenterPoints};
        board.locations = board.locations.map((location, i) => {
                if (i >= validPointIndexBoundary) { // invalid hexagons
                        context.fillStyle = "red"
                } else {
                        // context.fillStyle = "black";
                        // context.font = "30px Arial";
                        // context.fillText(i.toString(), ...location);
                        drawHex(...location, radius);
                }
                

                return location
        })
        board.roads = [];
        board.settlements = [];

        // TYPES
        class Road {
                constructor(closePoint1, closePoint2, farPoint1, farPoint2) {
                        this.startingPoint = vecMidpoint(closePoint1, closePoint2, farPoint1);
                        this.endingPoint = vecMidpoint(closePoint1, closePoint2, farPoint2);
                }

                draw() {
                        context.beginPath();
                        context.strokeStyle = "blue";
                        context.lineWidth = radius / 4;
                        context.moveTo(...this.startingPoint);
                        context.lineTo(...this.endingPoint);
                        context.stroke();
                }
        }

        class Settlement {
                constructor(closePoint1, closePoint2, closePoint3) {
                        this.location = vecMidpoint(closePoint1, closePoint2, closePoint3);
                }

                draw() {
                        drawCircle(this.location, radius / 4, "yellow");
                }
        }

        
        // DRAWING FUNCTIONS
        function drawHex(x, y, r) {
                let angle = (2 * Math.PI) / 6;
                rot = angle / 2; // centers the top

                context.beginPath();
                for (let i = 0; i <= 6; ++i) {
                        context.lineTo(x + r * Math.cos(angle * i + rot), y + r * Math.sin(angle * i + rot));
                }
                context.stroke()
        }

        function drawCircle(a, r = 2, color = "black") {
                context.beginPath();
                context.fillStyle = color;
                context.lineWidth = 1;
                context.strokeStyle = "black";
                context.arc(a[0], a[1], r, 0, 2 * Math.PI, false);
                context.fill();
                context.stroke();
        }

        // LOGIC
        const interpretClick = (clickedPoint) => {
                let closeConnections = [];
                let action = "nothing";


                for (let i = 0; i < board.locations.length; ++i) {
                        let dist = vecDist(clickedPoint, board.locations[i]);

                        if (dist < clickableRadius && i < validPointIndexBoundary) {
                                // clicked in the middle of one of the hexagons
                                action = "clickedCenter"
                                closeConnections = [{dist, location: board.locations[i]}];
                                break;
                        }
                        
                        if (dist < diameter) {                              
                                closeConnections.push({dist, location: board.locations[i]});
                        }
                }

                if (action === "clickedCenter") {
                } else if (closeConnections.length == 4) {
                        closeConnections.sort((a, b) => a.dist - b.dist);
                        action = "road";
                } else if (closeConnections.length == 3) {
                        action = "settlement";
                }

                return {action, connections: closeConnections.map((connection) => connection.location)};
        }


        // EVENT LISTENERS
        canvas.addEventListener('mousedown', (event) => {
                const rect = canvas.getBoundingClientRect();
                const clickedPoint = [event.x - rect.x, event.y - rect.y];

                let interpretation = interpretClick(clickedPoint);

                if (interpretation.action == "road") {
                        board.roads.push(new Road(...interpretation.connections));
                }

                if (interpretation.action == "settlement") {
                        board.settlements.push(new Settlement(...interpretation.connections));
                }
                
        })


        // MAIN LOOP
        let prevT = 0;
        const mainLoop = (t) => {
                const dt = t - prevT;
                prevT = t;

                context.clearRect(0, 0, canvas.width, canvas.height);
                board.locations.forEach((location, index) => index < validPointIndexBoundary &&
                                                             drawHex(...location, radius));
                board.roads.forEach((road) => road.draw());
                board.settlements.forEach((settlement) => settlement.draw());
                requestAnimationFrame(mainLoop);
        }
        requestAnimationFrame(mainLoop);
                
}