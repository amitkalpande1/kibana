/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable react/display-name */
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { usePushToService, ReturnUsePushToService, UsePushToService } from './';
import { TestProviders } from '../../../../mock';
import { usePostPushToService } from '../../../../containers/case/use_post_push_to_service';
import { basicPush, actionLicenses } from '../../../../containers/case/mock';
import * as i18n from './translations';
import { useGetActionLicense } from '../../../../containers/case/use_get_action_license';
import { getKibanaConfigError, getLicenseError } from './helpers';
import { connectorsMock } from '../../../../containers/case/configure/mock';
jest.mock('../../../../containers/case/use_get_action_license');
jest.mock('../../../../containers/case/use_post_push_to_service');
jest.mock('../../../../containers/case/configure/api');

describe('usePushToService', () => {
  const caseId = '12345';
  const updateCase = jest.fn();
  const postPushToService = jest.fn();
  const mockPostPush = {
    isLoading: false,
    postPushToService,
  };
  const mockConnector = connectorsMock[0];
  const actionLicense = actionLicenses[0];
  const caseServices = {
    '123': {
      ...basicPush,
      firstPushIndex: 0,
      lastPushIndex: 0,
      commentsToUpdate: [],
      hasDataToPush: true,
    },
  };
  const defaultArgs = {
    caseConnectorId: mockConnector.id,
    caseConnectorName: mockConnector.name,
    caseId,
    caseServices,
    caseStatus: 'open',
    connectors: connectorsMock,
    updateCase,
    userCanCrud: true,
  };
  beforeEach(() => {
    jest.resetAllMocks();
    (usePostPushToService as jest.Mock).mockImplementation(() => mockPostPush);
    (useGetActionLicense as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      actionLicense,
    }));
  });
  it('push case button posts the push with correct args', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () => usePushToService(defaultArgs),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      result.current.pushButton.props.children.props.onClick();
      expect(postPushToService).toBeCalledWith({
        caseId,
        caseServices,
        connectorId: mockConnector.id,
        connectorName: mockConnector.name,
        updateCase,
      });
      expect(result.current.pushCallouts).toBeNull();
    });
  });
  it('Displays message when user does not have premium license', async () => {
    (useGetActionLicense as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      actionLicense: {
        ...actionLicense,
        enabledInLicense: false,
      },
    }));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () => usePushToService(defaultArgs),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].title).toEqual(getLicenseError().title);
    });
  });
  it('Displays message when user does not have case enabled in config', async () => {
    (useGetActionLicense as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      actionLicense: {
        ...actionLicense,
        enabledInConfig: false,
      },
    }));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () => usePushToService(defaultArgs),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].title).toEqual(getKibanaConfigError().title);
    });
  });
  it('Displays message when user does not have a connector configured', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            caseConnectorId: 'none',
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].title).toEqual(i18n.PUSH_DISABLE_BY_NO_CASE_CONFIG_TITLE);
    });
  });
  it('Displays message when case is closed', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            caseStatus: 'closed',
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].title).toEqual(i18n.PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE);
    });
  });
});
