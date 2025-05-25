import DefaultVoices from "../models/default-sample-audio-model.js";

// CREATE one or more default voices (accept array)
export const createDefaultVoice = async (req, res, next) => {
    let voices = req.body;

    // Make sure voices is an array (agar single object aaya to array mein convert kar do)
    if (!Array.isArray(voices)) {
        voices = [voices];
    }

    // Validate each voice object
    for (const voice of voices) {
        const { name, category, audioSrc, description } = voice;

        if (!name || !category || !audioSrc || !description) {
            return res.status(400).json({
                success: false,
                message: "All fields (name, category, audioSrc, description) are required for every voice."
            });
        }
    }

    try {
        // Insert all voices at once
        const createdVoices = await DefaultVoices.insertMany(voices);

        res.status(201).json({
            success: true,
            data: createdVoices
        });
    } catch (error) {
        console.error("Error creating default voices:", error);
        res.status(500);
        next(error);
    }
};

// GET all default voices
export const getAllDefaultVoices = async (req, res, next) => {
    try {
        const voices = await DefaultVoices.find();
        res.status(200).json({ success: true, data: voices });
    } catch (error) {
        console.error("Error fetching default voices:", error);
        res.status(500);
        next(error);
    }
};

// UPDATE a default voice by ID
export const updateDefaultVoice = async (req, res, next) => {
    const { id } = req.params;
    const updatedFields = req.body;

    try {
        const updatedVoice = await DefaultVoices.findOneAndUpdate(
            { id },            
            updatedFields,
            { new: true }
        );

        if (!updatedVoice) {
            res.status(404);
            return next(new Error("Voice not found"));
        }

        res.status(200).json({ success: true, data: updatedVoice });
    } catch (error) {
        console.error("Error updating default voice:", error);
        res.status(500);
        next(error);
    }
};

// DELETE a default voice by ID
export const deleteDefaultVoice = async (req, res, next) => {
    const { id } = req.params;

    try {
        const deletedVoice = await DefaultVoices.findOneAndDelete({ id });

        if (!deletedVoice) {
            res.status(404);
            return next(new Error("Voice not found"));
        }

        res.status(200).json({ success: true, message: "Voice deleted" });
    } catch (error) {
        console.error("Error deleting default voice:", error);
        res.status(500);
        next(error);
    }
};
