import {MinHeap} from "./Min_Heap.js";

let set =
    {
        Undiscovered: -1,
        Closed: 0,
        Open: 1
    };
export let blockType =
    {
        wall: '#2c3e50',
        empty: '#70c8a0',//'#ecf0f1',
        start: '#f1c40f',
        end: '#e74c3c',
        path: '#2ecc71'
    };

export class SquareTravelNode
{
    constructor(x, y, size, type)
    {
        this.x = x || 0;
        this.y = y || 0;
        this.size = size || 0;

        this.type = type || blockType.empty;

        this.normalizedX = x / size;
        this.normalizedY = y / size;

        this.cameFrom = null;
        this.currentSet = set.Undiscovered;
        this.f_score = Infinity;
        this.g_score = Infinity;

        this.neighborIndices = [
            {x: this.normalizedX -1, y: this.normalizedY -1},//NorthWest
            {x: this.normalizedX, y: this.normalizedY -1},//North
            {x: this.normalizedX +1, y: this.normalizedY -1},//NorthEast
            {x: this.normalizedX +1, y: this.normalizedY},//East
            {x: this.normalizedX +1, y: this.normalizedY +1},//SouthEast
            {x: this.normalizedX, y: this.normalizedY +1},//South
            {x: this.normalizedX -1, y: this.normalizedY +1},//SouthWest
            {x: this.normalizedX -1, y: this.normalizedY}//West
        ];
    }

    blockType(type)
    {
        this.type = type;
        if(type === blockType.wall)
            this.currentSet = set.Closed;
        else
            this.currentSet = set.Undiscovered;
    }

    draw(context2D)
    {
        context2D.fillStyle = this.type;
        context2D.fillRect(this.x, this.y, this.size, this.size);
    }
}

export function findPath(grid, nodeDistance, startLocation, endLocation)
{
    let privateGrid = copy2DArray(grid);
    
    let startNode = privateGrid[startLocation.x][startLocation.y];
    startNode.f_score = 0;
    startNode.g_score = 0;

    let openSetMinQueue = new MinHeap();
    openSetMinQueue.push(startNode);

    let currentNode;
    let solutionArray = [];
    while(openSetMinQueue.size() > 0)
    {
        currentNode = openSetMinQueue.popMin();
        privateGrid[currentNode.normalizedX][currentNode.normalizedY].currentSet = set.Closed;

        if(currentNode.normalizedX === endLocation.x && currentNode.normalizedY === endLocation.y)
            return solutionArray;

        for(let i = 0; i < currentNode.neighborIndices.length; i++)
        {
            if(currentNode.neighborIndices[i].x < 0 || currentNode.neighborIndices[i].y < 0)
                continue;
            if(currentNode.neighborIndices[i].x >= privateGrid[0].length || currentNode.neighborIndices[i].y >= privateGrid[0].length)
                continue;

            let neighborNode = privateGrid[currentNode.neighborIndices[i].x][currentNode.neighborIndices[i].y];

            if(neighborNode.normalizedX === endLocation.x && neighborNode.normalizedY === endLocation.y)
            {
                console.log('\nfound solution\n');
                neighborNode.cameFrom = {x: currentNode.normalizedX, y: currentNode.normalizedY};
                solutionArray.push({x: neighborNode.normalizedX, y: neighborNode.normalizedY});
                let node = neighborNode;
                while(node.cameFrom)
                {
                    solutionArray.splice(0, 0, node.cameFrom);
                    node = privateGrid[node.cameFrom.x][node.cameFrom.y];
                }
                solutionArray.splice(0,1);
                return solutionArray;
            }

            if(neighborNode.currentSet === set.Closed)
                continue;

            let tempG_Score = currentNode.g_score + 50 + Math.hypot(Math.pow(neighborNode.normalizedX-currentNode.normalizedX,2) + Math.pow(neighborNode.normalizedY-currentNode.normalizedY,2));
            if(tempG_Score < neighborNode.g_score)
            {
                neighborNode.cameFrom = {x: currentNode.normalizedX, y: currentNode.normalizedY};
                neighborNode.g_score = tempG_Score;
                neighborNode.f_score = tempG_Score + (Math.hypot(Math.pow(neighborNode.normalizedX-endLocation.x,2) + Math.pow(neighborNode.normalizedY-endLocation.y,2)));

                if(neighborNode.currentSet === set.Undiscovered)
                {
                    neighborNode.currentSet = set.Open;
                    privateGrid[currentNode.neighborIndices[i].x][currentNode.neighborIndices[i].y] = neighborNode;
                    openSetMinQueue.push(neighborNode);
                }
            }

        }
    }
    console.log('no solution found');
    return solutionArray;
}
function copy2DArray(array)
{
    let newArray = new Array(array[0].length);
    for(let i = 0; i < array[0].length; i++)
    {
        newArray[i] = new Array(array[0].length);
        for(let j = 0; j < newArray[i].length;j++)
        {
            newArray[i][j] = Object.assign({}, array[i][j]);
        }
    }
    return newArray;
}