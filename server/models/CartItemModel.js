class CartItemModel {
    constructor(cartItemId, price ,artworkId, printSize, frameStyle, frameWidth, matWidth, matColor ) {
        this.cartItemId = cartItemId;
        this.price = price;
        this.artworkId = artworkId;
        this.printSize = printSize;
        this.frameStyle = frameStyle;
        this.frameWidth = frameWidth;
        this.matWidth = matWidth;
        this.matColor = matColor;

    }

}
module.exports = CartItemModel;
