import { text } from "stream/consumers"


const PromptSuggestionButton = ({text, onClick}: {text: string, onClick: () => void}) => {
    return (
        <button 
        className="prompt-suggestion-button"
        onClick={onClick}

        >
            {text}
        </button>
    )
}



export default PromptSuggestionButton