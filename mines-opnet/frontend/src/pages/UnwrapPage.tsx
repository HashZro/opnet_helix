import { useParams } from 'react-router-dom';

export function UnwrapPage() {
    const { address } = useParams<{ address: string }>();
    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Unwrap Tokens</h1>
            {address && <p className="text-gray-400">Mine: {address}</p>}
        </div>
    );
}
