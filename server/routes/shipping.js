/**
 * This module contains the routes under /shipping
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/destinations.json')));
const destinations = {"destinations" : raw.map(elem => ({ country: elem.country, displayName: elem.displayName, cost: elem.cost }))};

const routes = express.Router();

routes.get('/', (req, res) => {
    res.send(destinations);
});

module.exports = routes;
