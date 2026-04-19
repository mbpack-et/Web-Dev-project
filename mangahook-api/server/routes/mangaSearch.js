const { searchManga } = require("../services/mangadex")

const mangaSearch = require("express").Router()

mangaSearch.get("/:id", async (req, res) => {
    try {
        const response = await searchManga({
            title: req.params.id,
            page: req.query.page
        })

        res.json(response)
    } catch (error) {
        res.status(500).json({
            state: 500,
            message: "Could not search manga",
            details: error.message
        })
    }
})

module.exports = mangaSearch
