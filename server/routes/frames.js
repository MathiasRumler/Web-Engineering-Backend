/**
 * This module contains the routes under /frames
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const rawFrameStyles = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/frames.json')));
const frameStyles = rawFrameStyles.map(elem => ({
    style: elem.id,
    label: elem.label,
    slice: elem.border.slice,
    cost: elem.cost
}));

const routes = express.Router();

routes.get('/', (req, res) => {
    res.send(frameStyles);
});

routes.get('/:style/:imageType', async (req, res) => {
    const style = req.params.style;
    const imageType = req.params.imageType;

    let image = rawFrameStyles.find(elem => elem.id === style);
    if (image !== undefined) {
        if (imageType === 'borderImage') {
            image = image.border.image;
        } else if (imageType === 'thumbImage') {
            image = image.image;
        } else {
            return res.sendStatus(404);
        }
        res.sendFile(image, {'root': path.join(__dirname, '../resources')});
        return;
    }
    res.sendStatus(404);
});

module.exports = routes;
