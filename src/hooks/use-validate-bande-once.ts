import { useCallback, useState } from "react";

export type ValidateBandeOnceOptions = {
	// Optional local updater to sync UI state after success
	onLocalUpdate?: (bandeId: string) => void;
};

export function useValidateBandeOnce() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const validateBandeOnce = useCallback(async (bandeId: string, opts?: ValidateBandeOnceOptions) => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/bandes", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					bandeId,
					update: { isValid: true },
				}),
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({} as any));
				throw new Error((err as any)?.error || "Erreur lors de la mise à jour");
			}

			// Optional UI sync
			if (opts?.onLocalUpdate) {
				opts.onLocalUpdate(bandeId);
			}
		} catch (e: any) {
			setError(e?.message || "Erreur inconnue");
			throw e;
		} finally {
			setIsLoading(false);
		}
	}, []);

	return { isLoading, error, validateBandeOnce };
}
