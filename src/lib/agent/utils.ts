import * as fs from "fs";

// Helper function to extract JSON from response text
export function extractJSON(text: string): string | null {
	try {
		// Try to parse the text directly
		JSON.parse(text);
		return text;
	} catch {
		// Try to find JSON in markdown code blocks
		const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
		if (codeBlockMatch) {
			try {
				JSON.parse(codeBlockMatch[1]);
				return codeBlockMatch[1];
			} catch {
				// Continue to next method
			}
		}

		// Try to find JSON object between curly braces
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			try {
				JSON.parse(jsonMatch[0]);
				return jsonMatch[0];
			} catch {
				// Continue to next method
			}
		}

		return null;
	}
}

// Pre-processing function to extract text fields from a file
export function preprocessCastsFile(filePath: string): string {
	try {
		console.log(`[PreProcessor] Reading file: ${filePath}`);

		// Read the file content
		const fileContent = fs.readFileSync(filePath, "utf-8");

		// Parse the JSON - handle both direct array and object with extractedData property
		// biome-ignore lint/suspicious/noExplicitAny: need here
		let data: any;
		try {
			const parsed = JSON.parse(fileContent);
			// Check if it's wrapped in an object with extractedData property
			if (parsed.extractedData && Array.isArray(parsed.extractedData)) {
				data = parsed.extractedData;
			} else if (Array.isArray(parsed)) {
				data = parsed;
			} else {
				throw new Error(
					"Invalid data format: expected array or object with extractedData property",
				);
			}
		} catch (_parseError) {
			// If direct parsing fails, try to extract JSON from the file
			const jsonMatch = fileContent.match(/"extractedData":\s*(\[[\s\S]*\])/);
			if (jsonMatch) {
				data = JSON.parse(jsonMatch[1]);
			} else {
				throw new Error("Could not parse JSON from file");
			}
		}

		// Extract only the text field from each object
		// biome-ignore lint/suspicious/noExplicitAny: need here
		const extractedTexts = data.map((item: any) => ({
			text: item.text,
		}));

		console.log(
			`[PreProcessor] Extracted ${extractedTexts.length} text entries`,
		);

		// Return as JSON string
		return JSON.stringify(extractedTexts);
	} catch (error) {
		console.error("[PreProcessor] Error processing file:", error);
		throw error;
	}
}
