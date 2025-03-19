const MOTHERDUCK_ACCOUNT_NAME = 'vercel_service_account';

function randomString(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    return Array.from(randomValues)
        .map((x) => charset[x % charset.length])
        .join('');
}


// MOTHERDUCK: This creates a new read-scaling token for the Vercel service account that expires after ttl_s seconds. 
// See docs: https://motherduck.com/docs/key-tasks/authenticating-and-connecting-to-motherduck/read-scaling/ 
export default async function createReadScalingToken(ttl_s: number) {
    if (ttl_s <= 0) {
        throw new Error("TTL must be greater than 0");
    }
    const response = await fetch(`https://api.motherduck.com/v1/users/${MOTHERDUCK_ACCOUNT_NAME}/tokens`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.MOTHERDUCK_TOKEN
        },
        body: JSON.stringify({
            name: randomString(),
            ttl: ttl_s,
            read_only: true
        })
    });

    const data = await response.json();
    return data
};
