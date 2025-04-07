import fetch from "node-fetch";

exports.handler = async (event) => {
  try {
    const { url, params } = event.queryStringParameters;

    if (!url) {
      return {
        statusCode: 400,
        body: "Missing 'url' query parameter.",
      };
    }

    // Parse params into an object
    const queryParams = params ? new URLSearchParams(params).toString() : "";

    // Fetch the M3U8 file
    const response = await fetch(url);
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Failed to fetch M3U8 file: ${response.statusText}`,
      };
    }

    let playlist = await response.text();
    playlist = playlist.replace(/^i/, "");
    let modifiedPlaylist = [];

    // Modify each segment in the playlist
    playlist.split("\n").forEach((line) => {
      if (line.startsWith("#EXT-X-MEDIA")) {
        // Handle #EXT-X-MEDIA tags with URI attribute
        const uriMatch = line.match(/URI="([^"]+)"/);
        if (uriMatch) {
          const originalUri = uriMatch[1];
          const originalUrl = new URL(url);
          const fullUri = originalUri.startsWith("http")
            ? originalUri
            : `${originalUrl.href.substring(
                0,
                originalUrl.href.lastIndexOf("/")
              )}/${originalUri}`;
          const separator = fullUri.includes("?") ? "&" : "?";
          const modifiedLine = line.replace(
            /URI="([^"]+)"/,
            `URI="${fullUri}${separator}${queryParams}"`
          );
          modifiedPlaylist.push(modifiedLine);
        } else {
          modifiedPlaylist.push(line);
        }
      } else if (line.startsWith("#") || line.trim() === "") {
        // Leave other metadata lines unchanged
        modifiedPlaylist.push(line);
      } else {
        // Handle segment URLs (existing logic)
        const separator = line.includes("?") ? "&" : "?";
        const originalUrl = new URL(url);
        const segmentUrl = line.startsWith("http")
          ? line
          : `${originalUrl.href.substring(
              0,
              originalUrl.href.lastIndexOf("/")
            )}/${line}`;
        modifiedPlaylist.push(`${segmentUrl}${separator}${queryParams}`);
      }
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*", // Allow access from all origins
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: modifiedPlaylist.join("\n"),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Server error: ${error.message}`,
    };
  }
};
