use anchor_lang::prelude::*;

declare_id!("B3QX4ubjGz1RH3dBKrXwZNyRXtjDMUX2pjApyBBp5KhK");

#[program]
pub mod mint_gate {
    use super::*;
    pub fn init_collection(ctx: Context<InitCollection>, price_lamports: u64, start_time: i64, per_wallet_limit: u16, collection_id: [u8;32]) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.authority = ctx.accounts.authority.key();
        c.creator = ctx.accounts.creator.key();
        c.platform = ctx.accounts.platform.key();
        c.price_lamports = price_lamports;
        c.start_time = start_time;
        c.per_wallet_limit = per_wallet_limit;
        c.collection_id = collection_id;
        Ok(())
    }

    pub fn pay_and_validate(ctx: Context<PayAndValidate>) -> Result<()> {
        let cfg = &ctx.accounts.config;

        let now = Clock::get()?.unix_timestamp;
        require!(now >= cfg.start_time, MintError::SaleNotStarted);

        let counter = &mut ctx.accounts.counter;
        if counter.count >= cfg.per_wallet_limit {
            return err!(MintError::PerWalletLimit);
        }

        require!(cfg.price_lamports >= 10_000_000, MintError::PriceTooLow);

        let price = cfg.price_lamports;
        let to_creator = price.saturating_mul(99).checked_div(100).unwrap();
        let to_platform = price.saturating_sub(to_creator);

        let buyer = ctx.accounts.buyer.to_account_info();
        let creator = ctx.accounts.creator.to_account_info();
        let platform = ctx.accounts.platform.to_account_info();
        **buyer.try_borrow_mut_lamports()? -= price;
        **creator.try_borrow_mut_lamports()? += to_creator;
        **platform.try_borrow_mut_lamports()? += to_platform;

        counter.count += 1;

        emit!(MintAuthorized {
            collection_id: cfg.collection_id,
            buyer: buyer.key()
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitCollection<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: creator and platform are just lamport recipients
    pub creator: UncheckedAccount<'info>,
    /// CHECK:
    pub platform: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        seeds=[b"cfg", collection_seed.key().as_ref()],
        bump,
        space = 8 + Config::SIZE
    )]
    pub config: Account<'info, Config>,
    /// CHECK: any 32-byte seed key to bind the collection (e.g. Pubkey::new_from_array)
    pub collection_seed: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PayAndValidate<'info> {
    /// CHECK: payer
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub platform: UncheckedAccount<'info>,
    #[account(
        seeds=[b"cfg", collection_seed.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    /// compteur par wallet
    #[account(
        init_if_needed,
        payer = buyer,
        seeds=[b"ctr", collection_seed.key().as_ref(), buyer.key().as_ref()],
        bump,
        space = 8 + Counter::SIZE
    )]
    pub counter: Account<'info, Counter>,
    /// CHECK:
    pub collection_seed: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub creator: Pubkey,
    pub platform: Pubkey,
    pub price_lamports: u64,
    pub start_time: i64,
    pub per_wallet_limit: u16,
    pub collection_id: [u8;32],
}
impl Config { pub const SIZE: usize = 32+32+32 + 8 + 8 + 2 + 32; }

#[account]
pub struct Counter { pub count: u16 }
impl Counter { pub const SIZE: usize = 2; }

#[event]
pub struct MintAuthorized {
    pub collection_id: [u8;32],
    pub buyer: Pubkey
}

#[error_code]
pub enum MintError {
    #[msg("Sale not started")] SaleNotStarted,
    #[msg("Per-wallet limit reached")] PerWalletLimit,
    #[msg("Price too low")] PriceTooLow,
}


