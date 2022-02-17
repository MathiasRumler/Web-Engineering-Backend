/**
 * This module registers all the application logic
 * Use this file to register the routes you implemented.
 */

'use strict';

const express = require('express');
require('express-async-errors')
const cookieParser = require('cookie-parser');

const artworkRoutes = require('./routes/artworks.js');
const matsRoutes = require('./routes/mats');
const cartRoutes = require('./routes/cart');
const shippingRoutes = require('./routes/shipping');
const framesRoutes = require('./routes/frames');

const priceFunction = require('./utils/price.js');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Register the modules containing the routes
app.use('/artworks', artworkRoutes);
app.use('/mats', matsRoutes);
app.use('/cart', cartRoutes);
app.use('/shipping', shippingRoutes);
app.use('/frames', framesRoutes);

app.use((req,res,next) => {
  res.sendStatus(404);
});

module.exports = app;
