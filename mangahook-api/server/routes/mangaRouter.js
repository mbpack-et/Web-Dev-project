const { getMangaDetail, getChapter } = require("../services/mangadex")

const manga = require("express").Router()

manga.get("/:id", async (req, res) => {
    try {
        const response = await getMangaDetail(req.params.id)
        res.json(response)
    } catch (error) {
        res.status(500).json({
            state: 500,
            message: "Could not load manga details",
            details: error.message
        })
    }
})

manga.get("/:id/:ch", async (req, res) => {
    try {
        const response = await getChapter(req.params.id, req.params.ch)
        res.json(response)
    } catch (error) {
        res.status(500).json({
            state: 500,
            message: "Could not load chapter",
            details: error.message
        })
    }
})

module.exports = manga
