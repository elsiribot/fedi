const parseHtmlForFavicon = async (
    html: string,
    sourceUrl: URL | string,
): Promise<string> => {
    // Match all <link> tags
    const linkTagRegex = /<link[^>]*>/g
    const linkTags = html.match(linkTagRegex) || []

    // Define the rel values we're interested in, in priority order
    const relValues = ['apple-touch-icon', 'icon', 'shortcut icon']

    for (const rel of relValues) {
        for (const tag of linkTags) {
            const relMatch = tag.match(new RegExp(`rel="${rel}"`))
            const hrefMatch = tag.match(/href="([^"]*)"/)

            if (relMatch && hrefMatch) {
                let linkedFaviconUrl = new URL(hrefMatch[1], sourceUrl).href
                linkedFaviconUrl = linkedFaviconUrl.replace(/\/+$/, '') // Trim trailing slashes

                const linkedFaviconResponse = await fetch(linkedFaviconUrl)
                if (linkedFaviconResponse.ok) {
                    return linkedFaviconUrl
                }
            }
        }
    }

    return ''
}

const parseHtmlForTitle = (html: string): string => {
    // The order of these tags matches the order of priority given in the instructions
    const titleTags = [
        /<meta name="application-name" content="([^"]*)"/,
        /<meta name="apple-mobile-web-app-title" content="([^"]*)"/,
        /<title>([^<]*)<\/title>/,
    ]

    for (const tag of titleTags) {
        const match = tag.exec(html)
        if (match && match[1]) {
            return match[1]
        }
    }

    return ''
}

/**
 * Submit a fetch request to Fedimod URL to try and find metadata to use
 * as a default icon and title
 */
export async function fetchMetadataFromUrl(
    url: URL | string,
): Promise<{ fetchedFavicon: string; fetchedTitle: string }> {
    let fetchedTitle = '',
        fetchedFavicon = ''

    try {
        const htmlResponse = await fetch(url.toString())
        if (htmlResponse.ok) {
            const html = await htmlResponse.text()
            fetchedTitle = parseHtmlForTitle(html)
            fetchedFavicon = await parseHtmlForFavicon(html, url)

            if (!fetchedTitle) {
                fetchedTitle = new URL(url).hostname
            }
        }

        if (!fetchedFavicon) {
            // As a fallback, try and fetch favicon.ico from the root
            const faviconUrl = new URL('/favicon.ico', url).href
            const rootFaviconResponse = await fetch(faviconUrl)

            if (rootFaviconResponse.ok) {
                fetchedFavicon = faviconUrl
            }
        }
    } catch (error) {
        console.error('fetchFaviconFromUrl', error)
    }

    return {
        fetchedFavicon,
        fetchedTitle,
    }
}
