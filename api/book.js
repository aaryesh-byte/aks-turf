export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST' });

    // PASTE YOUR NEW GOOGLE APPS SCRIPT WEB APP URL HERE:
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwf3oZpyyeiaUgPRn2dYAVbucGCFhb0xgtZoJ4c9iB34T5-qbGTBx2Ol6PIVy-OfyKv1Q/exec";

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(req.body),
            headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
