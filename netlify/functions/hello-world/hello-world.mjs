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
    let modifiedPlaylist = [];

    // Modify each segment in the playlist
    playlist.split("\n").forEach((line) => {
      if (line.startsWith("#") || line.trim() === "") {
        // Leave metadata lines unchanged
        modifiedPlaylist.push(line);
      } else {
        // Modify segment URLs by appending query parameters
        const separator = line.includes("?") ? "&" : "?";
        modifiedPlaylist.push(`${line}${separator}${queryParams}`);
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
