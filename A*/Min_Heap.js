//TODO give generic sort input
export function MinHeap()
{
    let heap = [];
    let parent = index => Math.floor((index-1)*.5);
    let leftChild = index => 2 * index + 1;
    let rightChild = index => 2 * index + 2;

    this.size = function(){return heap.length;};
    this.log = function(){console.log(JSON.stringify(heap));};

    this.popMin = function()
    {
        if(heap.length === 1)
            return heap.pop();

        let min = heap[0];
        heap[0] = heap.pop();

        let currentIndex = 0;
        let childIndex;

        let tempValue;
        while(heap[leftChild(currentIndex)])
        {
            if(heap[rightChild(currentIndex)] && heap[rightChild(currentIndex)].f_score < heap[leftChild(currentIndex)].f_score)
                childIndex = rightChild(currentIndex);
            else
                childIndex = leftChild(currentIndex);

            if(heap[childIndex].f_score < heap[currentIndex].f_score)
            {
                tempValue = heap[currentIndex];
                heap[currentIndex] = heap[childIndex];
                heap[childIndex] = tempValue;
                currentIndex = childIndex;
            }
            else
                break;
        }
        return min;
    };
    let tempValue;
    this.push = function(x)
    {
        let currentIndex = heap.push(x)-1;
        if(currentIndex === 0)
            return;

        while(heap[parent(currentIndex)].f_score > x.f_score)
        {
            tempValue = heap[parent(currentIndex)];
            heap[parent(currentIndex)] = x;
            heap[currentIndex] = tempValue;
            currentIndex = parent(currentIndex);
            if(parent((currentIndex)) < 0)
                break;
        }
    };
}