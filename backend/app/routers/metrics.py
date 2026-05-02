from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.influencer import Influencer
from app.models.pending_response import PendingResponse
from app.models.user import User
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/metrics", tags=["metrics"])


class InfluencerMetrics(BaseModel):
    influencer_id: str
    influencer_name: str
    influencer_slug: str
    total: int
    approved: int
    edited: int
    ignored: int
    published: int
    approval_rate: float
    edit_rate: float
    ignore_rate: float


@router.get("/", response_model=list[InfluencerMetrics])
@limiter.limit("60/minute")
def get_metrics(
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[InfluencerMetrics]:
    """Return approval/edit/ignore metrics grouped by influencer."""
    influencers = db.query(Influencer).order_by(Influencer.name).all()

    counts = (
        db.query(
            PendingResponse.influencer_id,
            PendingResponse.status,
            func.count(PendingResponse.id).label("n"),
        )
        .filter(PendingResponse.status != "pending")
        .group_by(PendingResponse.influencer_id, PendingResponse.status)
        .all()
    )

    published_counts = (
        db.query(
            PendingResponse.influencer_id,
            func.count(PendingResponse.id).label("n"),
        )
        .filter(
            PendingResponse.status != "pending",
            PendingResponse.published_at != None,  # noqa: E711
        )
        .group_by(PendingResponse.influencer_id)
        .all()
    )

    # Build lookup dicts
    status_map: dict[str, dict[str, int]] = {}
    for row in counts:
        inf_id = str(row.influencer_id)
        status_map.setdefault(inf_id, {})[row.status] = row.n

    pub_map: dict[str, int] = {str(r.influencer_id): r.n for r in published_counts}

    result = []
    for inf in influencers:
        inf_id = str(inf.id)
        statuses = status_map.get(inf_id, {})
        approved = statuses.get("approved", 0)
        edited = statuses.get("edited", 0)
        ignored = statuses.get("ignored", 0)
        total = approved + edited + ignored
        published = pub_map.get(inf_id, 0)

        result.append(InfluencerMetrics(
            influencer_id=inf_id,
            influencer_name=inf.name,
            influencer_slug=inf.slug,
            total=total,
            approved=approved,
            edited=edited,
            ignored=ignored,
            published=published,
            approval_rate=round((approved + edited) / total * 100, 1) if total else 0.0,
            edit_rate=round(edited / total * 100, 1) if total else 0.0,
            ignore_rate=round(ignored / total * 100, 1) if total else 0.0,
        ))

    return result
