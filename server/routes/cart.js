/**
 * This module contains the routes under /cart
 */

'use strict';


const express = require('express');
const nanoid = require('nanoid'); // for sessionIDs
const BLING_API_KEY = 'ak_s21a3g124';
const cartPictureModel = require('../Models/CartPictureModel.js');
const {calculatePrice} = require("../utils/price.js");
const fetch = require('node-fetch');
const {writeOrder} = require("../utils/order");

const routes = express.Router();
let sessionCart = {}; // dictionary of carts with sessionIds
let paymentOrder = {}; // dictionary of orders with payment intents
let paymentSession = {}; // dictionary of payment intents with sessionIds
let currentId = 0;

function blingUrl(param) {
    return `https://web-engineering.big.tuwien.ac.at/s21/bling/${param}`;
}

/*TODO
    POST	/cart	Add an item to the shopping cart
    DELETE	/cart	Empty the shopping cart
    GET	    /cart/{id}	Retrieve a shopping cart item
 */

function getCart(sessionId) {
    return sessionCart[sessionId];
}

function createCart(sessionId) {
    sessionCart[sessionId] = [];
}

function addToCart(item, sessionId) {
    let cart = getCart(sessionId);
    if (cart === undefined) {
        return;
    }
    const price = calculatePrice(item.printSize, item.frameStyle, item.frameWidth, item.matWidth);
    const newItem = new cartPictureModel(currentId, price, item.artworkId, item.printSize, item.frameStyle, item.frameWidth, item.matWidth, item.matColor);
    currentId++;
    cart.push(newItem);
    sessionCart[sessionId] = cart;
    return cart;
}

function valid(cart) {
    //TODO json error message
    const printSizes = ['S', 'M', 'L'];
    //TODO const frameStyles = One of the frame styles returned by `GET /frames`
    for (let item of cart) {
        if (item.artworkId === undefined) {
            return false;
        }
        if (item.printSize === undefined || printSizes.find(elem => elem === item.printSize) === undefined) {
            return false;
        }

        if (item.frameWidth === undefined || item.frameWidth < 20 || item.frameWidth > 50) {
            return false;
        }
        if (item.matWidth === undefined || item.matWidth < 0 && item.matWidth > 100) {
            return false;
        }
        if (item.matWidth !== 0) {
            //TODO One of the color names returned by `GET /mats`
        }
    }
    return true;
}

function getCartItem(id, sessionId) {
    return getCart(sessionId).find(item => item.cartItemId == id);
}

function removeCartItem(id, sessionId) {
    sessionCart[sessionId] = getCart(sessionId).filter(item => item.cartItemId != id);
}

function deleteCart(sessionId) {
    sessionCart[sessionId] = [];
}


routes.get('/', (req, res) => {
    //TODO validate sessionId see report.html
    if (req.cookies.sessionId === undefined) {
        const sessionId = nanoid.nanoid(23);
        createCart(sessionId);
        res.cookie('sessionId', sessionId);
         return  res.send([]);
    }
    const cart = getCart(req.cookies.sessionId);
    if (cart !== undefined) {
        res.send(cart);
    } else {
        res.sendStatus(403);
    }
});

routes.post('/', (req, res) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId === undefined || getCart(sessionId) === undefined) {
        res.sendStatus(403);
        return;
    }
    let items = req.body;
    if (!(items instanceof Array)) {
        items = Array.of(items);
    }
    if (valid(items)) {
        items.forEach(item => addToCart(item, sessionId));
        res.sendStatus(201);
    } else {
        res.sendStatus(400);
    }
});

//Delete !
routes.delete('/', (req, res) => {
    if (req.cookies.sessionId === undefined || !getCart(req.cookies.sessionId)) {
        res.sendStatus(403);
        return;
    }
    deleteCart(req.cookies.sessionId);
    res.sendStatus(204);
});

routes.get('/:id', (req, res) => {
    if (getCart(req.cookies.sessionId) === undefined){
        return res.sendStatus(403);
    }

   const getItem = getCartItem(req.params.id, req.cookies.sessionId);
   if (getItem){
       return res.send(getItem)
   }else {
       return res.sendStatus(404);

   }
});

routes.delete('/:id', (req, res) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId === undefined || getCart(sessionId) === undefined) {
        res.sendStatus(403);
        return;
    }
    const getItem = getCartItem(req.params.id,req.cookies.sessionId);
    if (getItem){
        const deleteRequest = removeCartItem(req.params.id, req.cookies.sessionId);
        return res.sendStatus(204);
    }else {
        return res.sendStatus(404);
    }

});


routes.post('/checkout', async (req, res) => {
    const sessionId = req.cookies.sessionId;
    const cart = getCart(sessionId);
    const initiatorData = req.body;
    if (sessionId === undefined || cart === undefined) {
        res.sendStatus(403);
        return;
    }
    if (JSON.stringify(getCart(sessionId)) === JSON.stringify([]) || !validCheckout(initiatorData)) {
        res.sendStatus(400);
        return;
    }
    const base64apiKey = Buffer.from(process.env.BLING_API_KEY + ':').toString('base64');
    const amount = cart.reduce((accumulator, currentValue) => accumulator + currentValue.price, 0);

    let paymenIntent = await createPaymentIntent(amount, base64apiKey);

    createOrder(paymenIntent.id, paymenIntent.created_at, initiatorData, amount, cart);
    paymentSession[paymenIntent.id] = sessionId;

    res.send({
        "payment_intent_id": paymenIntent.id,
        "client_secret": paymenIntent.client_secret,
        "amount": amount,
        "currency": "eur"
    });
});

routes.post('/checkout/payment-update', ((req, res) => {
    const paymentIntent = req.body.payment_intent;
    if (!validPaymentIntent(paymentIntent)) {
        res.sendStatus(400);
        return;
    }
    paymentOrder[paymentIntent.id].card = paymentIntent.card;
    if (req.body.type === 'payment.succeeded') {
        writeOrder(paymentOrder[paymentIntent.id]);
        deleteCart(paymentSession[paymentIntent.id]);
    }
    res.sendStatus(204);
}));

function validCheckout(data) {
    if (data.email === undefined) {
        return false;
    }
    if (data.shipping_address === undefined) {
        return false;
    }
    const {city, country, postal_code, name, address} = data.shipping_address;
    if (name === undefined || address === undefined || city === undefined || country === undefined || postal_code === undefined) {
        return false;
    }

    return true;
}

function validPaymentIntent(paymentIntent) {
    const order = paymentOrder[paymentIntent.id];
    if (order === undefined) {
        return false;
    }
    if (paymentIntent.amount !== order.amount) {
        return false;
    }
    if (paymentIntent.created_at !== order.order_date) {
        return false;
    }
    if (paymentIntent.card === undefined) {
        return false;
    }
    return true;
}

function createOrder(id, created_at, initiatorData, amount, cart) {
    let orderCart = [];
    for (let cartElement of cart) {
        const {matColor, printSize, price, frameWidth, frameStyle, artworkId, matWidth} = cartElement;
        orderCart.push({
            "artworkId": artworkId,
            "printSize": printSize,
            "frameStyle": frameStyle,
            "frameWidth": frameWidth,
            "matWidth": matWidth,
            "matColor": matColor,
            "price": price
        });
    }
    paymentOrder[id] = {
        order_date: created_at,
        email: initiatorData.email,
        shipping_address: initiatorData.shipping_address,
        card: {},
        amount: amount,
        currency: 'eur',
        cart: orderCart
    };
}

async function createPaymentIntent(amount, key) {
    const resp = await fetch(blingUrl('payment_intents'), {
        method: 'POST',
        headers: {
            Authorization: `Basic ${key}`,
            ContentType: 'application/json'
        },
        body: JSON.stringify({
            "amount": amount,
            "currency": "eur",
            "webhook": `${process.env.ARTMART_BASE_URL}/cart/checkout/payment-update`
        })
    });
    return JSON.parse(resp.body.toString());
}

module.exports = routes;
