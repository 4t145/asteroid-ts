export function subject(subject: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(subject);
}

export function interest(interest: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(interest);
}

