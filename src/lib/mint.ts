export async function startMint(collectionId: string, buyer: string){
  const res = await fetch("/api/mint/start", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ collectionId, buyer })});
  if(!res.ok) throw new Error(`mint_start_failed`);
  return res.json();
}


