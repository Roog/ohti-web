export async function getFetching<T>(url: string): Promise<T> {
    try {
       const result = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
       return result.json() as Promise<T>;
    } catch(error) {
        throw error;
    }
}