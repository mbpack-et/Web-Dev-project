const { getMangaList } = require("../services/mangadex")

const mangaList = require("express").Router()

mangaList.get("/", async (req, res) => {
    try {
        const response = await getMangaList({
            page: req.query.page,
            type: req.query.type,
            state: req.query.state,
            category: req.query.category
        })

        res.json(response)
    } catch (error) {
        res.status(500).json({
            state: 500,
            message: "Could not load manga list",
            details: error.message
        })
    }
})

module.exports = mangaList
