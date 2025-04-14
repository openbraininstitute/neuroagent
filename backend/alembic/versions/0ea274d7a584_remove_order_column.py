"""remove order column

Revision ID: 0ea274d7a584
Revises: 818a9ba86187
Create Date: 2025-04-14 15:10:13.695396

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0ea274d7a584"
down_revision: Union[str, None] = "818a9ba86187"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("messages", "order")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "messages",
        sa.Column("order", sa.INTEGER(), autoincrement=False, nullable=False),
    )
    # ### end Alembic commands ###
