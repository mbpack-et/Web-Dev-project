const API_BASE_URL = "https://api.mangadex.org"
const COVER_BASE_URL = "https://uploads.mangadex.org/covers"
const PAGE_SIZE = 20

const TYPE_OPTIONS = [
    { id: "newest", type: "Newest" },
    { id: "latest", type: "Latest" },
    { id: "top-read", type: "Top read" }
]

const STATE_OPTIONS = [
    { id: "all", type: "All" },
    { id: "ongoing", type: "Ongoing" },
    { id: "completed", type: "Completed" },
    { id: "hiatus", type: "Hiatus" },
    { id: "cancelled", type: "Cancelled" }
]

let cachedCategories = null
let cachedCategoriesAt = 0

const appendSearchParams = (url, entries = []) => {
    entries.forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.append(key, value)
        }
    })
}

const fetchJson = async (path, searchEntries = []) => {
    const url = new URL(path, API_BASE_URL)
    appendSearchParams(url, searchEntries)

    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            "User-Agent": "mangahook-local/1.0"
        }
    })

    if (!response.ok) {
        throw new Error(`MangaDex request failed with status ${response.status}`)
    }

    return response.json()
}

const getLocalizedText = (record = {}) => {
    const preferredLocales = ["en", "ru", "ja-ro", "ko-ro", "ja", "ko"]

    for (const locale of preferredLocales) {
        if (record[locale]) {
            return record[locale]
        }
    }

    return Object.values(record)[0] || ""
}

const normalizeWhitespace = (text = "") =>
    text
        .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
        .replace(/[*_>#-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

const getTitle = (attributes = {}) => {
    const primaryTitle = getLocalizedText(attributes.title)

    if (primaryTitle) {
        return primaryTitle
    }

    const alternateTitles = attributes.altTitles || []

    for (const item of alternateTitles) {
        const title = getLocalizedText(item)

        if (title) {
            return title
        }
    }

    return "Untitled manga"
}

const getDescription = (attributes = {}) => {
    const text = normalizeWhitespace(getLocalizedText(attributes.description))
    return text || "No description provided by MangaHook."
}

const getRelationship = (entity = {}, type) =>
    (entity.relationships || []).find((relationship) => relationship.type === type)

const getCoverUrl = (entity = {}) => {
    const cover = getRelationship(entity, "cover_art")
    const fileName = cover?.attributes?.fileName

    if (!fileName) {
        return ""
    }

    return `${COVER_BASE_URL}/${entity.id}/${fileName}.256.jpg`
}

const getAuthorName = (entity = {}) => {
    const author = getRelationship(entity, "author") || getRelationship(entity, "artist")
    return author?.attributes?.name || "Unknown author"
}

const stripTrailingZero = (value) => value.replace(/\.0$/, "")

const formatCompactNumber = (value = 0) => {
    if (!Number.isFinite(value) || value <= 0) {
        return "0"
    }

    if (value >= 1_000_000_000) {
        return `${stripTrailingZero((value / 1_000_000_000).toFixed(1))}B`
    }

    if (value >= 1_000_000) {
        return `${stripTrailingZero((value / 1_000_000).toFixed(1))}M`
    }

    if (value >= 1_000) {
        return `${stripTrailingZero((value / 1_000).toFixed(1))}K`
    }

    return String(Math.round(value))
}

const formatDate = (value) => {
    if (!value) {
        return "Unknown update date"
    }

    return new Date(value).toISOString().slice(0, 10)
}

const capitalize = (value = "") => value.charAt(0).toUpperCase() + value.slice(1)

const getTagName = (tag = {}) => tag?.attributes?.name?.en || ""

const getCategoryOptions = async () => {
    const now = Date.now()

    if (cachedCategories && now - cachedCategoriesAt < 1000 * 60 * 60) {
        return cachedCategories
    }

    const response = await fetchJson("/manga/tag")
    const categories = [
        { id: "all", name: "ALL" },
        ...response.data
            .map((tag) => ({
                id: tag.id,
                name: getTagName(tag)
            }))
            .filter((tag) => tag.name)
            .sort((left, right) => left.name.localeCompare(right.name))
    ]

    cachedCategories = categories
    cachedCategoriesAt = now

    return categories
}

const getCategoryId = (categories, selectedCategory) => {
    if (!selectedCategory || selectedCategory.toUpperCase() === "ALL") {
        return null
    }

    const match = categories.find(
        (category) => category.name.toLowerCase() === selectedCategory.toLowerCase()
    )

    return match?.id || null
}

const getOrderField = (type = "Newest") => {
    const normalizedType = type.toLowerCase()

    if (normalizedType.includes("top")) {
        return "followedCount"
    }

    if (normalizedType.includes("latest")) {
        return "latestUploadedChapter"
    }

    return "createdAt"
}

const getStatusFilter = (state = "All") => {
    const normalizedState = state.toLowerCase()
    return STATE_OPTIONS.some((option) => option.id === normalizedState) && normalizedState !== "all"
        ? normalizedState
        : null
}

const fetchStatistics = async (ids = []) => {
    if (!ids.length) {
        return {}
    }

    const response = await fetchJson(
        "/statistics/manga",
        ids.map((id) => ["manga[]", id])
    )

    return response.statistics || {}
}

const fetchChapterFeed = async (mangaId, limit = 100) => {
    const englishFeed = await fetchJson(`/manga/${mangaId}/feed`, [
        ["translatedLanguage[]", "en"],
        ["order[chapter]", "desc"],
        ["limit", String(limit)]
    ])

    if ((englishFeed.data || []).length) {
        return englishFeed.data
    }

    const fallbackFeed = await fetchJson(`/manga/${mangaId}/feed`, [
        ["order[chapter]", "desc"],
        ["limit", String(limit)]
    ])

    return fallbackFeed.data || []
}

const mapListItem = (manga, statistics = {}) => {
    const attributes = manga.attributes || {}

    return {
        id: manga.id,
        image: getCoverUrl(manga),
        title: getTitle(attributes),
        chapter: attributes.lastChapter ? `Chapter ${attributes.lastChapter}` : "Latest update",
        view: formatCompactNumber(statistics.follows),
        description: getDescription(attributes)
    }
}

const mapChapter = (chapter) => {
    const attributes = chapter.attributes || {}
    const chapterNumber = attributes.chapter ? `Chapter ${attributes.chapter}` : "Chapter"
    const titleSuffix = attributes.title ? ` - ${attributes.title}` : ""

    return {
        id: chapter.id,
        path: `/chapter/${chapter.id}`,
        name: `${chapterNumber}${titleSuffix}`,
        view: attributes.externalUrl ? "External" : `${attributes.pages || 0} pages`,
        createdAt: formatDate(attributes.publishAt || attributes.createdAt)
    }
}

const getMangaList = async ({ page = 1, type = "Newest", state = "All", category }) => {
    const safePage = Number(page) > 0 ? Number(page) : 1
    const categories = await getCategoryOptions()
    const selectedCategoryId = getCategoryId(categories, category)
    const selectedStatus = getStatusFilter(state)

    const response = await fetchJson("/manga", [
        ["limit", String(PAGE_SIZE)],
        ["offset", String((safePage - 1) * PAGE_SIZE)],
        ["includes[]", "cover_art"],
        ["includes[]", "author"],
        ["includes[]", "artist"],
        ["hasAvailableChapters", "true"],
        [`order[${getOrderField(type)}]`, "desc"],
        ...(selectedCategoryId ? [["includedTags[]", selectedCategoryId]] : []),
        ...(selectedStatus ? [["status[]", selectedStatus]] : [])
    ])

    const mangaItems = response.data || []
    const statistics = await fetchStatistics(mangaItems.map((item) => item.id))

    return {
        mangaList: mangaItems.map((item) => mapListItem(item, statistics[item.id] || {})),
        metaData: {
            totalStories: response.total || mangaItems.length,
            totalPages: Math.max(1, Math.ceil((response.total || mangaItems.length) / PAGE_SIZE)),
            type: TYPE_OPTIONS,
            state: STATE_OPTIONS,
            category: categories
        }
    }
}

const getMangaDetail = async (mangaId) => {
    const [mangaResponse, feed, statisticsResponse] = await Promise.all([
        fetchJson(`/manga/${mangaId}`, [
            ["includes[]", "cover_art"],
            ["includes[]", "author"],
            ["includes[]", "artist"]
        ]),
        fetchChapterFeed(mangaId),
        fetchJson(`/statistics/manga/${mangaId}`)
    ])

    const manga = mangaResponse.data
    const attributes = manga.attributes || {}
    const statistics = statisticsResponse.statistics?.[mangaId] || {}

    return {
        imageUrl: getCoverUrl(manga),
        name: getTitle(attributes),
        author: getAuthorName(manga),
        description: getDescription(attributes),
        year: attributes.year || null,
        status: capitalize(attributes.status || "unknown"),
        updated: formatDate(attributes.updatedAt),
        view: formatCompactNumber(statistics.follows),
        genres: (attributes.tags || []).map(getTagName).filter(Boolean),
        chapterList: feed.map(mapChapter)
    }
}

const searchManga = async ({ title, page = 1 }) => {
    const safePage = Number(page) > 0 ? Number(page) : 1
    const response = await fetchJson("/manga", [
        ["title", title],
        ["limit", String(PAGE_SIZE)],
        ["offset", String((safePage - 1) * PAGE_SIZE)],
        ["includes[]", "cover_art"],
        ["includes[]", "author"],
        ["includes[]", "artist"],
        ["hasAvailableChapters", "true"]
    ])

    const mangaItems = response.data || []
    const statistics = await fetchStatistics(mangaItems.map((item) => item.id))

    return {
        mangaList: mangaItems.map((item) => ({
            ...mapListItem(item, statistics[item.id] || {}),
            description: undefined
        })),
        metaData: {
            totalPages: Math.max(1, Math.ceil((response.total || mangaItems.length) / PAGE_SIZE))
        }
    }
}

const getChapter = async (mangaId, chapterId) => {
    const [mangaDetail, chapterResponse, feed] = await Promise.all([
        getMangaDetail(mangaId),
        fetchJson(`/chapter/${chapterId}`),
        fetchChapterFeed(mangaId, 100)
    ])

    const chapter = chapterResponse.data
    const attributes = chapter.attributes || {}
    const chapterName = attributes.chapter ? `Chapter ${attributes.chapter}` : "Chapter"
    const imageResponse =
        attributes.pages && !attributes.externalUrl
            ? await fetchJson(`/at-home/server/${chapterId}`)
            : null

    const chapterHash = imageResponse?.chapter?.hash
    const imageFiles = imageResponse?.chapter?.data || []
    const images = chapterHash
        ? imageFiles.map((fileName) => ({
            title: chapterName,
            image: `${imageResponse.baseUrl}/data/${chapterHash}/${fileName}`
        }))
        : []

    return {
        title: mangaDetail.name,
        currentChapter: `${chapterName}${attributes.title ? ` - ${attributes.title}` : ""}`,
        chapterListIds: feed.map((item) => ({
            id: item.id,
            name: mapChapter(item).name
        })),
        images
    }
}

module.exports = {
    getMangaList,
    getMangaDetail,
    searchManga,
    getChapter
}
