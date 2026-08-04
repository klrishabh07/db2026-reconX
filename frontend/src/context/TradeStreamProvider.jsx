import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';

const TradeStreamContext = createContext(null);

const MAX_BUFFER = 200;

export function TradeStreamProvider({children}) {
    const [trades, setTrades] = useState([]);
    const [isConnected, setConnected] = useState(false);

    useEffect(() => {
        const sse = new EventSource('/api/v1/trades/stream');

        sse.onopen  = () => setConnected(true);
        sse.onerror = () => setConnected(false);
        
        sse.addEventListener('trade', (e) => {
            try {
                const trade = JSON.parse(e.data);

                console.log('Provider recieved', trade);
                
                setTrades((prev) => {
                    if(trade.id && prev.some((t) => t.id === trade.id)) {
                        return prev;
                    }

                    return [trade, ...prev].slice(0, MAX_BUFFER);
                });
            } catch(err) {
                console.log("Failed to parse trade", err);
            }
        });

        return () => {
            console.log("sse closed");
            sse.close();
        }
    }, []);

    const clearTrades = () => {
        setTrades([]);
    }

    const value = useMemo(
        () => ({
            trades,
            isConnected,
            clearTrades
        }),
        [trades, isConnected]
    );

    return (
        <TradeStreamContext.Provider value = {value}>
            {children}
        </TradeStreamContext.Provider>
    );
}

export function useTradeStream() {
    const context = useContext(TradeStreamContext);

    if(!context) {
        throw new Error('useTradeStream must be used inside TradeStreamProvider');
    }

    return context;
}

