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

        // TYPES
        const rollMapping = (k) => {
                return Math.floor(k / 6) + k + 1;
        }

        const typeMapping = [
                ["ore", "gray"],
                ["wheat", "yellow"],
                ["brick", "red"],
                ["wood", "green"],
                ["wool", "orange"]
        ]
        

        const tileLookup = {};
        class Tile {
                constructor(location) {
                        this.location = location;
                        this.type = Math.floor(Math.random() * typeMapping.length);
                        this.typeString = typeMapping[this.type][0];
                        this.rollValue = rollMapping(Math.floor(Math.random() * 10) + 1);
                        console.log(this.type, this.rollValue);

                        tileLookup[this.rollValue] = tileLookup[this.rollValue] ?? [];
                        tileLookup[this.rollValue].push(this);
                }

                draw() {
                        

                        drawHex(...this.location, radius, typeMapping[this.type][1]);

                        context.fillStyle = "black";
                        context.font = "30px Arial";
                        context.textBaseline = "middle";
                        context.textAlign = "center";
                        context.fillText(this.rollValue.toString(), ...this.location);
                }
        }

        class Settlement {
                constructor(closeTile1, closeTile2, closeTile3) {
                        this.location = vecMidpoint(closeTile1.location, closeTile2.location, closeTile3.location);
                        this.touching = [];
                }

                draw() {
                        drawCircle(this.location, radius / 4, "yellow");
                }
        }

        class Road {
                constructor(closeTile1, closeTile2, farTile1, farTile2) {
                        this.startingPoint = vecMidpoint(closeTile1.location, closeTile2.location, farTile1.location);
                        this.endingPoint = vecMidpoint(closeTile1.location, closeTile2.location, farTile2.location);
                        this.closeTiles = [closeTile1, closeTile2, farTile1, farTile2];
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


        let board = {}
        board.tiles = [];
        for (let i = 0; i < validPointIndexBoundary; ++i) {
                board.tiles.push(new Tile(hexagonCenterPoints[i]))
        }       
        board.roads = [];
        board.settlements = [];
        console.log(board.tiles);

        
        // DRAWING FUNCTIONS
        function drawHex(x, y, r, color = "white") {
                let angle = (2 * Math.PI) / 6;
                rot = angle / 2; // centers the top

                context.beginPath();
                context.lineWidth = 1;
                context.strokeStyle = "black";
                context.fillStyle = color;
                for (let i = 0; i <= 6; ++i) {
                        context.lineTo(x + r * Math.cos(angle * i + rot), y + r * Math.sin(angle * i + rot));
                }
                context.fill();
                context.stroke();
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

                for (let i = 0; i < board.tiles.length; ++i) {
                        let dist = vecDist(clickedPoint, board.tiles[i].location);

                        if (dist < clickableRadius && i < validPointIndexBoundary) {
                                // clicked in the middle of one of the hexagons
                                action = "clickedCenter"
                                closeConnections = [{dist, tile: board.tiles[i]}];
                                break;
                        }
                        
                        if (dist < diameter) {                              
                                closeConnections.push({dist, tile: board.tiles[i]});
                        }
                }

                if (action === "clickedCenter") {
                } else if (closeConnections.length == 4) {
                        closeConnections.sort((a, b) => a.dist - b.dist);
                        action = "road";
                } else if (closeConnections.length == 3) {
                        action = "settlement";
                }

                return {action, tiles: closeConnections.map((connection) => connection.tile)};
        }


        // EVENT LISTENERS
        canvas.addEventListener('mousedown', (event) => {
                const rect = canvas.getBoundingClientRect();
                const clickedPoint = [event.x - rect.x, event.y - rect.y];

                let interpretation = interpretClick(clickedPoint);

                if (interpretation.action == "road") {
                        board.roads.push(new Road(...interpretation.tiles));
                }

                if (interpretation.action == "settlement") {
                        board.settlements.push(new Settlement(...interpretation.tiles));
                }
                
        })

        // MAIN LOOP
        let prevT = 0;
        const mainLoop = (t) => {
                const dt = t - prevT;
                prevT = t;

                context.clearRect(0, 0, canvas.width, canvas.height);
                board.tiles.forEach((tile, index) => index < validPointIndexBoundary && tile.draw())
                board.roads.forEach((road) => road.draw());
                board.settlements.forEach((settlement) => settlement.draw());
                requestAnimationFrame(mainLoop);
        }
        requestAnimationFrame(mainLoop);
                
}