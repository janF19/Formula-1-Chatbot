import PromptSuggestionButton from "./PromptSuggestionButton"


const PromptSuggestionsRow = ({onPromptClick}) => {
    const prompts = [
        "Who is head of racing for Aston Martin's F1 Academy team?",
        "Who is the highest paid F1 Driver?",
        "Who will be the newest driver for ferrari?",
        "Who is the current Formula one World Driver's champion?",


    ]
    return (
        <div className="prompt-suggestion-row">
            {prompts.map((prompt, index) => 
            <PromptSuggestionButton 
            key={`suggestion-${index}`}
            text = {prompt}
            onClick={() => onPromptClick(prompt)}
            />)}
        </div>
    )
}


export default PromptSuggestionsRow