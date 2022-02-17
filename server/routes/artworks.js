/**
 * This module contains the routes under /artworks
 */

'use strict';

//external libraries
const express = require('express');
const routes = express.Router();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const pictureModule = require('../Models/PictureModule.js');
const highlightJson = require('../resources/highlights.json')

//variables
let artworkCache = undefined;
const highlightArray = highlightJson.highlights;
let highlightArrayCache = [];
let lastSearchQuery = '';
let searchResultArrayCache = [];


const MET_BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';

async function getArtwork(id) {
    const res = await fetch(MET_BASE_URL + '/objects/' + id);
    if (!res.ok) {
        return null;
    }
    const obj = await res.json();
    if (!obj || !obj.objectID) {
        return null;
    }
    return new pictureModule(obj.objectID, obj.title, obj.artistDisplayName, obj.objectDate, obj.primaryImageSmall);
}

async function getHighLights() {

    const highlightPromises = Promise.all(highlightArray.map((highlightPictureId, i) =>
        getArtwork(highlightPictureId).then(resp => resp)
    ))
    return highlightPromises;
}

async function getSearchQuery(searchParameter) {
    const anzahlAnTreffern = await fetch(MET_BASE_URL + '/search?hasImages=true&q=' + searchParameter);
    if (!anzahlAnTreffern.ok) {
        return null;
    }
    const results = await anzahlAnTreffern.json();
    if (!results.objectIDs) {
        return null;
    } else {
        console.log(results.objectIDs)
    }
    const searchPromise = Promise.all(results.objectIDs.splice(0, 100).map((resultPictureId, i) =>
        getArtwork(resultPictureId).then(resp => resp)
    ))
    return searchPromise;

}

routes.get('/', async (req, res) => {
    if (req.query.q == null) {

        if (highlightArrayCache.length === 0) {
            console.log('highlight api')
            const highlightPicturePromise = getHighLights().then(json => {
                highlightArrayCache = json;
                res.send(json);
            })
        } else {
            console.log('highlight cache')
            res.send(highlightArrayCache);
        }

    } else {

        if (searchResultArrayCache.length !== 0 && lastSearchQuery === req.query.q) {
            console.log('searchCache')
            res.send(searchResultArrayCache);
        } else {
            console.log(req.query.q);
            console.log('suchanfrage schicken')
            const searchPicturePromise = getSearchQuery(req.query.q).then(json => {
                // console.log(json);
                if (json === null) {
                    searchResultArrayCache = [];
                    res.send([]);
                    return;
                }
                searchResultArrayCache = json;
                lastSearchQuery = req.query.q;
                res.send(json);
            })
        }
    }
});

routes.get('/:id', async (req, res) => {

    if (artworkCache !== undefined && artworkCache.artworkId == req.params.id) {
        res.send(artworkCache)
    } else {
        const artwork = getArtwork(parseInt(req.params.id)).then(artworkResponse => {
            if (artworkResponse) {
                artworkCache = artworkResponse;
                res.send(artworkResponse);
            } else {
                res.sendStatus(404);
            }

        })

    }


});

module.exports = routes;
