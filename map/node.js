function Node(index, x, y, dx, dy, rightBbox, leftBbox, rightChild, leftChild){
    this.index = index;
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.rightBbox = rightBbox;
    this.leftBbox = leftBbox;
    this.rightChild = rightChild;
    this.leftChild = leftChild;
}
Node.sizeOf = 28;

module.exports = Node;