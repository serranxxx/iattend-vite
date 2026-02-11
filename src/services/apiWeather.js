

export async function CurrentForecast(operation, zipCode, country) {
    try {
        await operation({
            method: "GET",
            url: `forecast?zip=${zipCode},${country}&units=metric&appid=082be73deb2bcc79d867d128e39dfa2b`,
        })

    } catch (error) {
        console.error(error)
    }
}