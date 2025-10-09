from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError

from neuroagent.app.dependencies import get_settings, get_storage_client, get_user_info
from neuroagent.app.main import app
from neuroagent.app.schemas import UserInfo


@pytest.mark.httpx_mock
def test_generate_presigned_url(app_client, test_user_info):
    """Test the presigned URL generation endpoint."""
    # Mock dependencies
    mock_s3 = Mock()
    mock_s3.generate_presigned_url.return_value = "https://fake-presigned-url"
    mock_s3.head_object.return_value = True

    app.dependency_overrides[get_storage_client] = lambda: mock_s3
    app.dependency_overrides[get_settings] = lambda: Mock(
        storage=Mock(container_name="test-bucket", expires_in=600),
        misc=Mock(application_prefix="whatever"),
    )
    app.dependency_overrides[get_user_info] = lambda: UserInfo(
        sub=test_user_info[0], groups=[]
    )

    def make_request(filename):
        return app_client.get(f"/storage/{filename}/presigned-url")

    # Test successful case
    response = make_request("test-file.txt")
    assert response.status_code == 200
    assert response.json() == "https://fake-presigned-url"

    # Verify S3 client calls
    mock_s3.head_object.assert_called_once_with(
        Bucket="test-bucket",
        Key=f"{test_user_info[0]}/test-file.txt",
    )
    mock_s3.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": "test-bucket", "Key": f"{test_user_info[0]}/test-file.txt"},
        ExpiresIn=600,
    )

    # Test file not found
    mock_s3.head_object.side_effect = ClientError(
        {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject"
    )
    response = make_request("nonexistent-file.txt")
    assert response.status_code == 404
    assert response.json()["detail"] == "File nonexistent-file.txt not found"

    # Test S3 error
    mock_s3.head_object.side_effect = ClientError(
        {"Error": {"Code": "500", "Message": "Internal Error"}}, "HeadObject"
    )
    response = make_request("test-file.txt")
    assert response.status_code == 500
    assert response.json()["detail"] == "Error accessing the file"
