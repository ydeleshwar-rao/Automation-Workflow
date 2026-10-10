"use client" 
function Error({error,reset}:{error:Error, reset: () => void }) {
    return (
        <>
        <h1>Something went Wrong Please try to debug the issue ...</h1>
        <p>{error.message}</p>
        <button onClick={reset}>TryAgain</button>
         </>
    )
}

export default Error;