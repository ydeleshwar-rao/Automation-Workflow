 "use client" 
function ErrorAuth({error, reset}:{error: Error, reset: () => void}) {
    return(<>
    <h1>Something Went Wrong  Please Check and Debug the Issue...</h1>
    <p>{error.message}</p>
    <button onClick={reset}>Try Again</button>
    </>)
}

export default ErrorAuth;