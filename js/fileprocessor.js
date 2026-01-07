document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("fileUpload");
    const extractButton = document.getElementById("extractButton");
    const output = document.getElementById("output");

    let loadedFile = null;

    fileInput.addEventListener("change", function (event) {
        const file = event.target.files[0];

        if (!file || !file.name.endsWith(".pptx")) {
            output.innerHTML = "<p style='color: red;'>Please upload a valid .pptx file.</p>";
            extractButton.disabled = true;
            return;
        }

        loadedFile = file;
        extractButton.disabled = false;
        output.innerHTML = "<p style='color: green;'>File loaded successfully! Click 'Extract Data'.</p>";
    });

    extractButton.addEventListener("click", async function () {
        if (!loadedFile) return;

        console.log("Starting extraction process...");

        const reader = new FileReader();
        reader.onload = async function (e) {
            const arrayBuffer = e.target.result;
            const zip = await JSZip.loadAsync(arrayBuffer);
            processPPTX(zip);
        };

        reader.readAsArrayBuffer(loadedFile);
    });

    async function processPPTX(zip) {
        console.log("Unzipping PowerPoint file...");
        let performanceSlideText = "";

        for (const filePath of Object.keys(zip.files)) {
            if (filePath.startsWith("ppt/slides/slide") && filePath.endsWith(".xml")) {
                console.log(`Processing slide: ${filePath}`);

                const slideXML = await zip.files[filePath].async("text");
                const slideText = extractTextFromXML(slideXML);

                if (slideText.includes("Performance Envelope")) {
                    console.log(`Identified 'Performance Envelope' slide: ${filePath}`);
                    performanceSlideText = slideText;
                    break;
                }
            }
        }

        if (performanceSlideText) {
            console.log("Extracted Performance Slide Text:\n", performanceSlideText);
            const extractedData = extractPerformanceData(performanceSlideText);
            console.log("Extracted Performance Data:\n", extractedData);
            displayExtractedData(extractedData);
        } else {
            console.log("No 'Performance Envelope' slide found.");
            output.innerHTML = "<p style='color: red;'>No 'Performance Envelope' slide found.</p>";
        }
    }

    function extractTextFromXML(xml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "text/xml");

        let textElements = xmlDoc.getElementsByTagName("a:t");
        let extractedText = Array.from(textElements).map(el => el.textContent).join(" ");

        console.log("Parsed text from XML:\n", extractedText);
        return extractedText;
    }

    function extractPerformanceData(text) {
        return {
            peakCPU: extractValue(text, /Peak CPU\s*([\d.]+ GHz)/i),
            netCPU: extractValue(text, /Net CPU\s*([\d.]+ GHz)/i),
            totalCores: extractValue(text, /Cores\s*(\d+)/i),
            totalStorage: extractValue(text, /Total\s*([\d.]+ TiB)/i),
            usedStorage: extractValue(text, /Used\s*([\d.]+ TiB)/i),
            freeStorage: extractValue(text, /Free\s*([\d.]+ TiB)/i),
            peakMemory: extractValue(text, /Peak Memory Usage\s*([\d.]+ TiB)/i),
            totalMemory: extractValue(text, /Total Memory\s*([\d.]+ TiB)/i),
            peakNetworkThroughput: formatMbps(extractValue(text, /([\d.]+)\s*megabits\/s(?=.*Peak Aggregate Network Throughput)/i)),
            iops95: extractValue(text, /([\d,]+)\s*(?=IOPS at 95%)/i),
            avgDailyWrite: extractValue(text, /([\d.]+ TiB)\s*(?=Average Daily Write)/i),
        };
    }

    function extractValue(text, regex) {
        const match = text.match(regex);
        return match ? match[1].trim() : "N/A";
    }

    function formatMbps(value) {
    return value && !value.includes("Mbps") ? value + " Mbps" : value;
}

    function displayExtractedData(data) {
        console.log("Displaying extracted data:", data);

        output.innerHTML = Object.keys(data)
            .map(key => `<p><strong>${key.replace(/([A-Z])/g, " $1").trim()}:</strong> ${data[key]}</p>`)
            .join("");
    }
});