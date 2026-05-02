"""`avcm` CLI — pipeline runs, memory ingest, API server."""

from __future__ import annotations

from pathlib import Path

import typer
import uvicorn
from dotenv import load_dotenv

from core.config import RunConfig
from core.pipeline import get_controller

load_dotenv()

app = typer.Typer(no_args_is_help=True)
memory_app = typer.Typer(no_args_is_help=True)
app.add_typer(memory_app, name="memory")


@app.command("run")
def run_cmd(
    niche: str = typer.Option(..., "--niche", help="Target niche"),
    subreddits: str | None = typer.Option(
        None,
        "--subreddits",
        help="Comma-separated subreddit names (no r/ prefix); auto if omitted",
    ),
    platforms: str = typer.Option(
        "twitter,linkedin",
        "--platforms",
        help="Comma-separated output platforms",
    ),
    angles: int = typer.Option(5, "--angles"),
    variations: int = typer.Option(2, "--variations"),
    top_k_memory: int = typer.Option(5, "--top-k-memory"),
    instagram: bool = typer.Option(
        False,
        "--instagram/--no-instagram",
        help="Include Instagram stub tool (full Apify wiring pending)",
    ),
    run_id: str | None = typer.Option(None, "--run-id"),
) -> None:
    """Execute one AVCM pipeline run."""
    subs_list = [s.strip() for s in subreddits.split(",")] if subreddits else None
    plat_list = [p.strip() for p in platforms.split(",") if p.strip()]
    cfg = RunConfig(
        niche=niche,
        subreddits=subs_list,
        platforms=plat_list,
        angles=angles,
        variations=variations,
        top_k_memory=top_k_memory,
        include_instagram=instagram,
        run_id=run_id,
    )
    ctrl = get_controller()
    result = ctrl.run(cfg)
    if result.success:
        typer.echo(typer.style("SUCCESS", fg=typer.colors.GREEN))
        typer.echo(f"run_id={result.run_id}")
        typer.echo(f"pieces={len(result.pieces)}")
        if result.summary:
            typer.echo(result.summary.model_dump_json(indent=2))
    else:
        typer.echo(typer.style("FAILED", fg=typer.colors.RED))
        typer.echo(result.error or "unknown error")


@memory_app.command("ingest")
def memory_ingest(csv_path: Path = typer.Argument(..., exists=True, readable=True)) -> None:
    """Update actual engagement metrics from CSV (content_id, likes, shares, comments)."""
    from memory.update import ingest_csv

    rows = ingest_csv(csv_path)
    typer.echo(f"Updated {len(rows)} rows.")
    for r in rows:
        typer.echo(str(r))


@app.command("serve")
def serve_cmd(
    host: str = typer.Option("127.0.0.1", "--host"),
    port: int = typer.Option(8000, "--port"),
) -> None:
    """Run FastAPI server (same PipelineController as CLI)."""
    uvicorn.run("api.server:app", host=host, port=port, reload=True)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
