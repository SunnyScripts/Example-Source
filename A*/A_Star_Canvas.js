import {blockType, SquareTravelNode, findPath} from './A_Star.js';

class NodeNetwork
{
    constructor(drawContext, gridWidth)
    {
        this.drawContext = drawContext;
        this.gridWidth = gridWidth || 100;
        this.grid = [];
        this.solutionPath = [];

        this.nodeWidth = Math.floor(document.getElementById('canvas').width / this.gridWidth);
        this.refreshGrid(this.gridWidth);
    }

    refreshGrid(gridWidth)
    {
        this.gridWidth = gridWidth || this.gridWidth;
        this.nodeWidth = Math.floor(document.getElementById('canvas').width / this.gridWidth);

        this.grid = new Array(this.gridWidth);
        for(let i = 0; i < this.gridWidth; i++)
        {
            this.grid[i] = new Array(this.gridWidth);
            for(let j = 0; j < this.gridWidth; j++)
            {
                let node = new SquareTravelNode(i * this.nodeWidth, j * this.nodeWidth, this.nodeWidth);

                if(i > 24 || i < 5 || j > 21 || j < 4)
                    node.blockType(blockType.wall);

                this.grid[i][j] = node;
                node.draw(this.drawContext);
            }
        }
    }
}

export default class AStarCanvas
{
    constructor(canvas, numberOfColumns)
    {
        let context2D = canvas.getContext('2d');
        this.nodeNetwork = new NodeNetwork(context2D, numberOfColumns);

        let currentlySelectedBlock = blockType.end;

        let nodeIndex = {x: null, y: null};
        let lastNode = null;
        let tempType;
        let isMouseDown = false;

        this.path =
            {
                start:
                    {
                        previousLocation: {},
                        previousBlockType: null
                    },
                end:
                    {
                        previousLocation: {},
                        previousBlockType: null
                    }
            };

        // canvas.addEventListener('mousemove', event =>
        // {
        //     nodeIndex = {x: Math.floor(event.layerX / this.nodeNetwork.nodeWidth), y: Math.floor(event.layerY / this.nodeNetwork.nodeWidth)};
        //
        //     if(!lastNode)
        //     {
        //         lastNode = this.nodeNetwork.grid[nodeIndex.x][nodeIndex.y];
        //         this.updateNode();
        //     }
        //     else if(nodeIndex.x !== lastNode.normalizedX || nodeIndex.y !== lastNode.normalizedY)
        //     {
        //         this.updateNode();
        //     }
        // });
        // canvas.addEventListener('mousedown', event => {isMouseDown = true; this.updateNode();});
        //
        // canvas.addEventListener('mouseup', event => {isMouseDown = false;});

        window.addEventListener('keyup', event =>
        {
            switch (event.keyCode)
            {
                case 67://C
                    switch (currentlySelectedBlock)
                    {
                        case blockType.wall:
                            currentlySelectedBlock = blockType.empty;
                            break;
                        case blockType.empty:
                            currentlySelectedBlock = blockType.start;
                            break;
                        case blockType.start:
                            currentlySelectedBlock = blockType.end;
                            break;
                        case blockType.end:
                            currentlySelectedBlock = blockType.wall;
                            break;
                    }
                    this.updateNode();
                    break;
                case 82://R
                    // if(this.nodeNetwork.solutionPath.length > 0)
                    //     this.removeTempNodes(this.nodeNetwork.solutionPath);

                    let then = Date.now();
                    this.nodeNetwork.solutionPath = findPath(this.nodeNetwork.grid, this.nodeNetwork.nodeWidth, this.path.start.previousLocation, this.path.end.previousLocation);
                    console.log(Date.now() - then + 'ms');
                    // this.drawTempNodes(blockType.path, this.nodeNetwork.solutionPath);
                    break;
                case 69://E
                    this.removeTempNodes(this.nodeNetwork.solutionPath);
                    this.nodeNetwork.solutionPath = [];
                    break;
                case 68://D
                    this.nodeNetwork.refreshGrid();
                    this.path =
                        {
                            start:
                                {
                                    previousLocation: {},
                                    previousBlockType: null
                                },
                            end:
                                {
                                    previousLocation: {},
                                    previousBlockType: null
                                }
                        };
                    lastNode = null;
                    this.updateNode();
                    break;
            }
        });

        this.drawTempNodes = (type, array) =>
        {
            for(let i = 0; i < array.length; i++)
            {
                context2D.fillStyle = type;
                context2D.fillRect(array[i].x * this.nodeNetwork.nodeWidth, array[i].y * this.nodeNetwork.nodeWidth, this.nodeNetwork.nodeWidth, this.nodeNetwork.nodeWidth);
            }
        };
        this.removeTempNodes = (array) =>
        {
            for(let i = 0; i < array.length; i++)
            {
                this.nodeNetwork.grid[array[i].x][array[i].y].draw(this.nodeNetwork.drawContext);
            }
        };

         this.updateNode = function()
        {
            tempType = this.nodeNetwork.grid[nodeIndex.x][nodeIndex.y].type;
            this.nodeNetwork.grid[nodeIndex.x][nodeIndex.y].blockType(currentlySelectedBlock);
            this.nodeNetwork.grid[nodeIndex.x][nodeIndex.y].draw(context2D);

            if(!isMouseDown)
            {
                this.nodeNetwork.grid[nodeIndex.x][nodeIndex.y].blockType(tempType);
            }
            else
            {
                if(currentlySelectedBlock === blockType.start)
                {
                    if(this.path.start.previousBlockType)
                    {
                        this.nodeNetwork.grid[this.path.start.previousLocation.x][this.path.start.previousLocation.y].blockType(this.path.start.previousBlockType);
                        this.nodeNetwork.grid[this.path.start.previousLocation.x][this.path.start.previousLocation.y].draw(context2D);
                    }
                    this.path.start.previousBlockType = tempType;
                    this.path.start.previousLocation = nodeIndex;
                }
                else if(currentlySelectedBlock === blockType.end)
                {
                    if(this.path.end.previousBlockType)
                    {
                        this.nodeNetwork.grid[this.path.end.previousLocation.x][this.path.end.previousLocation.y].blockType(this.path.end.previousBlockType);
                        this.nodeNetwork.grid[this.path.end.previousLocation.x][this.path.end.previousLocation.y].draw(context2D);
                    }
                    this.path.end.previousBlockType = tempType;
                    this.path.end.previousLocation = nodeIndex;
                }
            }

            if(lastNode && (nodeIndex.x !== lastNode.normalizedX || nodeIndex.y !== lastNode.normalizedY))
                lastNode.draw(context2D);

            lastNode = this.nodeNetwork.grid[nodeIndex.x][nodeIndex.y];
        }
    }

    run()
    {
        // if(this.nodeNetwork.solutionPath.length > 0)
        //     this.removeTempNodes(this.nodeNetwork.solutionPath);
        let then = Date.now();
        this.nodeNetwork.solutionPath = findPath(this.nodeNetwork.grid, this.nodeNetwork.nodeWidth, this.path.start.previousLocation, this.path.end.previousLocation);
        console.log(Date.now() - then + 'ms');
        // this.drawTempNodes(blockType.path, this.nodeNetwork.solutionPath);

    }

}



