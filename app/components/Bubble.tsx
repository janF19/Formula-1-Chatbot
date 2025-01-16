







const Bubble = ({ message }: { message: { content: string; role: 'user' | 'assistant' } }) => {
    return (
        <div className={`bubble ${message.role}`}>
            <div className="bubble-content">
                {message.content}
            </div>
        </div>
    );
};

export default Bubble;